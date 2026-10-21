import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

class GeminiService {
  private client: GoogleGenAI | null = null;
  private embeddingModel: string;
  private generationModel: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      this.client = new GoogleGenAI({ apiKey });
    }
    this.embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
    this.generationModel = process.env.GEMINI_GENERATION_MODEL || 'gemma-4-31b-it';
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
    
    // Ordered candidate models: Gemma 4 primary -> Gemini 3 Flash Preview -> Gemini 3.5 Flash
    const modelChain = [
      this.generationModel,
      'gemini-3-flash-preview',
      'gemini-3.5-flash',
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
}

export const geminiService = new GeminiService();
