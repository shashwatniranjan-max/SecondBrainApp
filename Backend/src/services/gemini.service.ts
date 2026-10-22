import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

class GeminiService {
  private client: GoogleGenAI | null = null;
  private embeddingModel: string;
  private generationModel: string;
  private fallbackModel: string;
  private imageTimeoutMs: number;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      this.client = new GoogleGenAI({ apiKey });
    }
    this.embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
    this.generationModel = process.env.GEMINI_GENERATION_MODEL || 'gemma-4-31b-it';
    this.fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3-flash-preview';
    this.imageTimeoutMs = Number(process.env.GEMMA_IMAGE_TIMEOUT_MS) || 25000;
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('GEMINI_API_KEY is not configured in Backend/.env. Please provide a valid Google AI Studio key.');
      }
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  /**
   * Generates a 768-dimensional embedding vector for a single string
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const ai = this.getClient();
    try {
      const response = await ai.models.embedContent({
        model: this.embeddingModel,
        contents: text,
        config: {
          outputDimensionality: 768,
        },
      });

      // Extract vector array from either single embedding or array
      const vector = (response as any).embedding?.values || 
                     (response as any).embeddings?.[0]?.values;

      if (!vector || !Array.isArray(vector)) {
        throw new Error('Received invalid embedding format from Gemini API');
      }

      return vector;
    } catch (error: any) {
      console.error(`GeminiService embedContent error (${this.embeddingModel}):`, error.message);
      throw error;
    }
  }

  /**
   * Generates embeddings in batches with automatic rate-limit backoff
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      let retries = 4;

      while (retries >= 0) {
        try {
          const vec = await this.generateEmbedding(text);
          results.push(vec);
          // Small pacing delay to stay comfortably under 100 RPM limit
          await new Promise((r) => setTimeout(r, 400));
          break;
        } catch (err: any) {
          const isRateLimit =
            err.message?.includes('RESOURCE_EXHAUSTED') ||
            err.message?.includes('429') ||
            err.message?.includes('Quota exceeded');

          if (isRateLimit && retries > 0) {
            console.warn(`[Gemini Free Tier] Rate limit encountered. Cooling down for 20s before retry...`);
            await new Promise((r) => setTimeout(r, 20000));
            retries--;
          } else {
            throw err;
          }
        }
      }
    }

    return results;
  }

  /**
   * Generates a response targeting Gemma 4 with resilient fallback cascade
   */
  async generateAnswer(systemInstruction: string, prompt: string): Promise<string> {
    const ai = this.getClient();
    const combinedPrompt = `${systemInstruction}\n\n---\n\n${prompt}`;
    
    // Ordered candidate models: Gemma 4 primary -> Gemini 3 Flash Preview fallback
    const modelChain = [
      this.generationModel,
      'gemini-3-flash-preview',
    ].filter((m, i, arr) => arr.indexOf(m) === i); // Deduplicate

    let lastError: any = null;

    for (const model of modelChain) {
      try {
        console.log(`[RAG Generation] Attempting generation with model: ${model}...`);
        // If Gemma 4 TPU queue in Google AI Studio takes >5s, fast-fail to Gemini Flash for instant response
        const timeoutMs = model.startsWith('gemma') ? 5000 : 12000;
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${model} timed out after ${timeoutMs}ms`)), timeoutMs)
        );

        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents: combinedPrompt,
            config: {
              temperature: 0.3,
            },
          }),
          timeoutPromise,
        ]);

        if (response && response.text) {
          console.log(`[RAG Generation] Successfully generated response with: ${model}`);
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[RAG Generation] Model ${model} failed (${err.status || err.message}). Trying next fallback...`);
      }
    }

    throw lastError || new Error('All generation models in fallback chain failed');
  }

  /**
   * Analyzes an image with Gemma 4 primary model and resilient Gemini Flash fallback
   */
  async analyzeImage(buffer: Buffer, mimeType: string): Promise<ImageAnalysisResult> {
    const ai = this.getClient();

    const base64Data = buffer.toString('base64');
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const promptText = `Analyze this image thoroughly for personal knowledge indexing and question answering in a Second Brain application.
Extract all meaningful information, transcribe text, and explain diagrams so the user can search and ask questions about this image later.

INSTRUCTIONS:
1. SUMMARY: Provide a concise 2-4 sentence summary of what the image depicts and its core purpose.
2. EXTRACTED TEXT: Transcribe all visible text as accurately as possible. Preserve headings, hierarchical lists, equations, labels, code snippets, and technical terminology. If there is no visible text, write "No text present".
3. KEY CONCEPTS: List 3-8 key concepts, technical terms, algorithms, definitions, or topics covered in the image.
4. DETAILED EXPLANATION: Explain diagrams, charts, flowcharts, workflows, steps, system architectures, or technical illustrations in depth. Preserve relationships, arrow directions, cause-and-effect sequences, data flows, and component roles. Distinguish visible information from inferences.
5. IMPORTANT RELATIONSHIPS: Describe key connections between components, variables, entities, or steps shown in the image.
6. UNCERTAINTIES: Explicitly indicate any illegible text, ambiguous arrows, cropped areas, or uncertain details. Write "None" if everything is clear.
7. GROUNDING: Do NOT invent or extrapolate information that cannot be supported by the image.

RESPONSE FORMAT:
You MUST respond with valid JSON matching this exact structure:
{
  "summary": "Concise summary...",
  "extractedText": "Accurately transcribed text...",
  "keyConcepts": ["Concept 1", "Concept 2"],
  "detailedExplanation": "Thorough explanation of diagrams, flows, and concepts...",
  "importantRelationships": ["Relationship 1", "Relationship 2"],
  "uncertainties": "None"
}`;

    const textPart = { text: promptText };

    // Ordered candidate models: Gemma 4 primary -> Gemini Flash fallback
    const modelChain = [
      this.generationModel,
      this.fallbackModel,
      'gemini-2.5-flash',
    ].filter((m, i, arr) => arr.indexOf(m) === i); // Deduplicate

    let lastError: any = null;

    for (const model of modelChain) {
      try {
        console.log(`[Image Analysis] Attempting image analysis with model: ${model}...`);
        const timeoutMs = model.startsWith('gemma') ? this.imageTimeoutMs : 35000;
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${model} timed out after ${timeoutMs}ms`)), timeoutMs)
        );

        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents: [imagePart, textPart],
            config: {
              temperature: 0.2,
            },
          }),
          timeoutPromise,
        ]);

        if (response && response.text) {
          console.log(`[Image Analysis] Successfully generated analysis with: ${model}`);
          return this.parseAndValidateImageAnalysis(response.text, model);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[Image Analysis] Model ${model} failed (${err.status || err.message}). Trying next fallback...`
        );
      }
    }

    throw lastError || new Error('All image analysis models in fallback chain failed');
  }

  /**
   * Safely parses and validates structured JSON output with fallback recovery
   */
  parseAndValidateImageAnalysis(rawText: string, modelName: string): ImageAnalysisResult {
    if (!rawText || !rawText.trim()) {
      throw new Error('Model returned empty response for image analysis');
    }

    let cleaned = rawText.trim();
    // Strip markdown json code block if present
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(cleaned);
      const summary =
        typeof parsed.summary === 'string' && parsed.summary.trim()
          ? parsed.summary.trim()
          : 'Image knowledge extraction';
      const extractedText =
        typeof parsed.extractedText === 'string' ? parsed.extractedText.trim() : '';
      const keyConcepts = Array.isArray(parsed.keyConcepts)
        ? parsed.keyConcepts.map((k: any) => String(k).trim()).filter(Boolean)
        : [];
      const detailedExplanation =
        typeof parsed.detailedExplanation === 'string' && parsed.detailedExplanation.trim()
          ? parsed.detailedExplanation.trim()
          : '';
      const importantRelationships = Array.isArray(parsed.importantRelationships)
        ? parsed.importantRelationships.map((r: any) => String(r).trim()).filter(Boolean)
        : [];
      const uncertainties =
        typeof parsed.uncertainties === 'string' ? parsed.uncertainties.trim() : undefined;

      return {
        summary,
        extractedText,
        keyConcepts: keyConcepts.length > 0 ? keyConcepts : ['Image Analysis', 'Visual Knowledge'],
        detailedExplanation: detailedExplanation || extractedText || summary,
        importantRelationships,
        uncertainties:
          uncertainties && uncertainties.toLowerCase() !== 'none' ? uncertainties : undefined,
        modelUsed: modelName,
      };
    } catch {
      console.warn(
        `[Image Analysis] JSON parse failed on ${modelName} output. Attempting heuristic extraction...`
      );

      const summaryMatch = rawText.match(/(?:summary|image summary)[:\s]+([^\n]+(?:\n[^\n#]+)*)/i);
      const textMatch = rawText.match(/(?:extracted text|visible text)[:\s]+([^\n]+(?:\n[^\n#]+)*)/i);
      const explanationMatch = rawText.match(
        /(?:detailed explanation|breakdown|diagram explanation)[:\s]+([^\n]+(?:\n[^\n#]+)*)/i
      );

      const summary = summaryMatch ? summaryMatch[1].trim() : rawText.slice(0, 180) + '...';
      const extractedText = textMatch ? textMatch[1].trim() : '';
      const detailedExplanation = explanationMatch ? explanationMatch[1].trim() : rawText.trim();

      return {
        summary,
        extractedText,
        keyConcepts: ['Visual Knowledge', 'Image Analysis'],
        detailedExplanation,
        importantRelationships: [],
        uncertainties: undefined,
        modelUsed: modelName,
      };
    }
  }

  /**
   * Formats structured ImageAnalysisResult into a clean, searchable Markdown representation
   */
  formatImageAnalysisAsMarkdown(analysis: ImageAnalysisResult): string {
    const sections: string[] = [];

    sections.push(`## Summary\n${analysis.summary}`);

    if (analysis.extractedText && analysis.extractedText !== 'No text present') {
      sections.push(`## Extracted Text & Code\n${analysis.extractedText}`);
    }

    if (analysis.keyConcepts && analysis.keyConcepts.length > 0) {
      sections.push(`## Key Concepts\n${analysis.keyConcepts.map((c) => `- ${c}`).join('\n')}`);
    }

    if (analysis.detailedExplanation) {
      sections.push(`## Detailed Diagram & Technical Breakdown\n${analysis.detailedExplanation}`);
    }

    if (analysis.importantRelationships && analysis.importantRelationships.length > 0) {
      sections.push(
        `## Key Relationships & Connections\n${analysis.importantRelationships.map((r) => `- ${r}`).join('\n')}`
      );
    }

    if (analysis.uncertainties && analysis.uncertainties.toLowerCase() !== 'none') {
      sections.push(`## Uncertainties & Ambiguities\n${analysis.uncertainties}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Multimodal vision Q&A for a saved image with Gemma 4 primary model and resilient Gemini Flash fallback
   */
  async answerImageQuestion(
    buffer: Buffer,
    mimeType: string,
    question: string,
    imageTitle: string,
    extractedText?: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const ai = this.getClient();

    const base64Data = buffer.toString('base64');
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    let historyContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      historyContext =
        `\n\nRecent conversation history:\n` +
        conversationHistory
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n');
    }

    let priorAnalysisContext = '';
    if (extractedText && extractedText.trim() && !extractedText.includes('Image pending AI analysis')) {
      priorAnalysisContext = `\n\nPreviously extracted text/analysis for this image:\n${extractedText.slice(0, 3000)}`;
    }

    const promptText = `You are a helpful assistant for the user's personal knowledge base in the Second Brain application.
The user is asking a question about the attached image titled "${imageTitle}".

INSTRUCTIONS:
1. Examine the image carefully. Answer the user's question directly based on what is visible in the image (text, handwriting, diagrams, charts, labels, code, workflows, connections).
2. Clearly distinguish direct visual observations from inferences, interpretations, or uncertainty.
3. If parts of the image are blurry, illegible, cropped, or ambiguous, state that clearly instead of guessing or hallucinating.
4. If previously extracted text is provided below, you may use it to confirm difficult-to-read terms, but rely primarily on the visual image.
5. Provide a clear, well-structured response using Markdown formatting where helpful.${priorAnalysisContext}${historyContext}

User Question: ${question}`;

    const textPart = { text: promptText };

    // Primary: Gemma 4 -> Fallback: Gemini Flash -> Gemini 2.5 Flash
    const modelChain = [
      this.generationModel,
      this.fallbackModel,
      'gemini-2.5-flash',
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    let lastError: any = null;

    for (const model of modelChain) {
      try {
        console.log(`[Image Q&A] Attempting multimodal answer with model: ${model}...`);
        const timeoutMs = model.startsWith('gemma') ? this.imageTimeoutMs : 25000;
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${model} timed out after ${timeoutMs}ms`)), timeoutMs)
        );

        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents: [imagePart, textPart],
            config: {
              temperature: 0.2,
            },
          }),
          timeoutPromise,
        ]);

        if (response && response.text) {
          console.log(`[Image Q&A] Successfully answered with model: ${model}`);
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Image Q&A] Model ${model} failed (${err.status || err.message}). Trying fallback...`);
      }
    }

    throw lastError || new Error('All image Q&A models in fallback chain failed');
  }
}

export interface ImageAnalysisResult {
  summary: string;
  extractedText: string;
  keyConcepts: string[];
  detailedExplanation: string;
  importantRelationships: string[];
  uncertainties?: string;
  modelUsed?: string;
}

export const geminiService = new GeminiService();

