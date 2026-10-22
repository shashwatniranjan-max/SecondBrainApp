import mongoose from 'mongoose';
import { Knowledge, IKnowledge } from '../models/Knowledge';
import { KnowledgeChunk, IKnowledgeChunk } from '../models/KnowledgeChunk';
import { geminiService } from './gemini.service';
import { r2Service } from './r2Service';
const { PDFParse } = require('pdf-parse');

export interface RetrievedChunk {
  knowledgeId: string;
  title: string;
  type: string;
  text: string;
  score: number;
  sourceKind: string;
  sourceUrl?: string;
  chunkIndex: number;
}

export class RAGService {
  /**
   * Recursive character & paragraph text splitter with overlap
   */
  splitTextIntoChunks(text: string, chunkSize = 1200, overlap = 200): string[] {
    const cleanText = text.replace(/\r\n/g, '\n').trim();
    if (!cleanText) return [];
    if (cleanText.length <= chunkSize) return [cleanText];

    const chunks: string[] = [];
    const paragraphs = cleanText.split(/\n\s*\n/);
    let currentChunk = '';

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if ((currentChunk + '\n\n' + trimmedPara).length <= chunkSize) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
      } else {
        // If currentChunk has enough text, push it
        if (currentChunk.length >= 200) {
          chunks.push(currentChunk.trim());
          // Create overlap from the end of currentChunk
          const overlapText = currentChunk.slice(-overlap);
          currentChunk = `${overlapText}\n\n${trimmedPara}`;
        } else if (trimmedPara.length > chunkSize) {
          // If a single paragraph is very long, split by sentences
          const sentences = trimmedPara.split(/(?<=[.?!])\s+/);
          for (const sentence of sentences) {
            if ((currentChunk + ' ' + sentence).length <= chunkSize) {
              currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
            } else {
              if (currentChunk) chunks.push(currentChunk.trim());
              currentChunk = sentence;
            }
          }
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = trimmedPara;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Extracts plaintext from a PDF buffer safely
   */
  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const res = await parser.getText();
      return (res.text || '').replace(/\s+/g, ' ').trim();
    } catch (err: any) {
      console.error('Failed to extract PDF text:', err.message);
      return '';
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  /**
   * Resolves the full plaintext content of any knowledge item
   */
  async extractFullText(knowledge: IKnowledge): Promise<string> {
    const joinedContent = Array.isArray(knowledge.content) 
      ? knowledge.content.join('\n\n') 
      : String(knowledge.content || '');

    // Check if it's a PDF that needs R2 buffer extraction
    if (knowledge.type === 'PDF' && knowledge.source?.objectKey) {
      const isPlaceholder = joinedContent.trim() === 'Your new knowledge has been processed.' || 
                            joinedContent.trim() === (knowledge.source.originalName || '');
      
      if (isPlaceholder || joinedContent.length < 50) {
        try {
          const buffer = await r2Service.getFileBuffer(knowledge.source.objectKey);
          const extracted = await this.extractTextFromPdf(buffer);
          if (extracted && extracted.length > 50) {
            // Cache back into knowledge document
            knowledge.content = [extracted];
            await knowledge.save();
            return extracted;
          }
        } catch (err: any) {
          console.warn(`Could not extract PDF from R2 for ${knowledge._id}:`, err.message);
        }
      }
    }

    if (knowledge.type === 'URL' && joinedContent.startsWith('http')) {
      return `Title: ${knowledge.title}\nDescription: ${knowledge.description}\nURL: ${joinedContent}`;
    }

    return joinedContent;
  }

  /**
   * Indexes a knowledge item: chunks it, generates embeddings, stores in KnowledgeChunk
   */
  async indexKnowledge(knowledgeId: string | mongoose.Types.ObjectId): Promise<number> {
    const knowledge = await Knowledge.findById(knowledgeId);
    if (!knowledge) {
      throw new Error(`Knowledge document ${knowledgeId} not found`);
    }

    // 1. Delete existing chunks for idempotency
    await KnowledgeChunk.deleteMany({ knowledgeId: knowledge._id });

    // 2. Extract full text
    const text = await this.extractFullText(knowledge);
    if (!text || text.trim().length < 15) {
      knowledge.embeddingStatus = 'completed';
      knowledge.chunkCount = 0;
      await knowledge.save();
      return 0;
    }

    // 3. Split into overlapping chunks
    const rawChunks = this.splitTextIntoChunks(text);
    if (rawChunks.length === 0) {
      knowledge.embeddingStatus = 'completed';
      knowledge.chunkCount = 0;
      await knowledge.save();
      return 0;
    }

    // 4. Enrich chunk text with document title context for higher semantic precision
    const enrichedChunkTexts = rawChunks.map(
      (chunk, idx) => `[Document: ${knowledge.title} | Type: ${knowledge.type}]\n${chunk}`
    );

    // 5. Generate embeddings via Gemini API
    const vectors = await geminiService.generateEmbeddingsBatch(enrichedChunkTexts);

    // 6. Insert chunk documents
    const chunkDocs = rawChunks.map((chunk, idx) => ({
      knowledgeId: knowledge._id,
      userId: knowledge.userId,
      chunkIndex: idx,
      text: chunk,
      embedding: vectors[idx],
      metadata: {
        title: knowledge.title,
        type: knowledge.type,
        tags: knowledge.tags || [],
        sourceKind: knowledge.source?.kind || 'text',
        sourceUrl: knowledge.source?.url,
      },
    }));

    await KnowledgeChunk.insertMany(chunkDocs);

    // 7. Update parent knowledge document
    knowledge.embeddingStatus = 'completed';
    knowledge.chunkCount = chunkDocs.length;
    await knowledge.save();

    console.log(`Successfully indexed ${chunkDocs.length} chunks for "${knowledge.title}"`);
    return chunkDocs.length;
  }

  /**
   * Deletes all chunk records when a knowledge item is deleted
   */
  async deleteKnowledgeChunks(knowledgeId: string | mongoose.Types.ObjectId): Promise<void> {
    await KnowledgeChunk.deleteMany({ knowledgeId });
  }

  /**
   * Searches for top similar chunks for a specific user using Atlas Vector Search
   * with fallback to in-memory cosine similarity if index is still propagating
   */
  async searchSimilarChunks(
    userId: string,
    query: string,
    limit = 5,
    minScore = 0.55
  ): Promise<RetrievedChunk[]> {
    // 1. Embed incoming query using the identical model
    const queryVector = await geminiService.generateEmbedding(query);

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 2. Attempt native MongoDB Atlas Vector Search
    try {
      const results = await KnowledgeChunk.aggregate([
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: queryVector,
            numCandidates: Math.max(50, limit * 10),
            limit: limit * 2,
            filter: {
              userId: { $eq: userObjectId },
            },
          },
        },
        {
          $project: {
            knowledgeId: 1,
            userId: 1,
            chunkIndex: 1,
            text: 1,
            metadata: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ]);

      if (results && results.length > 0) {
        // MongoDB Atlas Vector Search returns score = (1 + cosine) / 2 for cosine metric.
        // Normalize back to true cosine similarity (-1 to 1, clamped to 0 to 1 for relevance):
        const normalizedResults = results.map((r: any) => ({
          ...r,
          score: Math.max(0, 2 * (r.score !== undefined ? Number(r.score) : 0) - 1),
        }));
        return this.formatAndDeduplicate(normalizedResults, query, minScore, limit);
      }
    } catch (atlasError: any) {
      console.warn(
        'Atlas $vectorSearch query failed or index pending, using fallback vector scoring:',
        atlasError.message
      );
    }

    // 3. Fallback Vector Search (In-Memory Cosine Similarity over user's chunks)
    // Ensures seamless local testing & robustness while Atlas search indexes build
    const userChunks = await KnowledgeChunk.find({ userId: userObjectId }).limit(300).lean();
    if (!userChunks || userChunks.length === 0) {
      return [];
    }

    const scoredChunks = userChunks.map((chunk) => {
      const score = this.cosineSimilarity(queryVector, chunk.embedding);
      return {
        knowledgeId: chunk.knowledgeId.toString(),
        title: chunk.metadata.title,
        type: chunk.metadata.type,
        text: chunk.text,
        score,
        sourceKind: chunk.metadata.sourceKind,
        sourceUrl: chunk.metadata.sourceUrl,
        chunkIndex: chunk.chunkIndex,
      };
    });

    // Sort descending by score
    scoredChunks.sort((a, b) => b.score - a.score);

    return this.formatAndDeduplicate(scoredChunks, query, minScore, limit);
  }

  /**
   * Helper: Calculates cosine similarity between two float vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      const a = vecA[i] ?? 0;
      const b = vecB[i] ?? 0;
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Helper: Filters by minScore, boosts exact title/keyword matches (hybrid retrieval),
   * and deduplicates to avoid multiple chunks from same source
   */
  private formatAndDeduplicate(
    items: any[],
    query: string,
    minScore: number,
    limit: number
  ): RetrievedChunk[] {
    if (!items || items.length === 0) return [];

    // Extract significant query terms (lowercase, >= 3 chars, omitting stop words)
    const queryLower = query.toLowerCase();
    const stopWords = new Set([
      'what', 'when', 'where', 'which', 'who', 'whom', 'this', 'that', 'with',
      'from', 'your', 'have', 'does', 'tell', 'about', 'notes', 'note', 'show',
      'give', 'find', 'some', 'into', 'then', 'than', 'them', 'they', 'explain'
    ]);
    const queryWords = queryLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !stopWords.has(w));

    // Hybrid keyword & title match boosting
    const boostedItems = items.map((item) => {
      let score = item.score !== undefined ? Number(item.score) : 0;
      const title = (item.metadata?.title || item.title || '').trim();
      const titleLower = title.toLowerCase();

      // Check if user's question explicitly mentions this note's title
      const titleInQuery = titleLower.length >= 3 && (
        queryLower.includes(titleLower) ||
        new RegExp(`\\b${titleLower}\\b`, 'i').test(queryLower)
      );

      // Check if any distinct word from the title matches the query
      const titleWordsInQuery = queryWords.some(
        (w) => titleLower.includes(w) || w.includes(titleLower)
      );

      if (titleInQuery) {
        // High confidence direct title mention
        score = Math.max(score, score + 0.14);
      } else if (titleWordsInQuery) {
        score = Math.max(score, score + 0.07);
      }

      return {
        ...item,
        score: Math.min(1.0, score),
      };
    });

    // Re-sort by boosted score
    boostedItems.sort((a, b) => b.score - a.score);

    // Gate: If the top match does not meet the relevance threshold,
    // this query is a general knowledge question or casual conversational remark.
    // Return empty so the assistant answers purely with general knowledge!
    const topScore = boostedItems[0].score !== undefined ? Number(boostedItems[0].score) : 0;
    if (topScore < minScore) {
      return [];
    }

    const filtered: RetrievedChunk[] = [];
    const seenDocuments = new Map<string, number>();

    for (const item of boostedItems) {
      const score = item.score !== undefined ? Number(item.score) : 0;
      if (score < minScore) continue;

      const knowledgeId = item.knowledgeId?.toString() || '';
      const docCount = seenDocuments.get(knowledgeId) || 0;

      // Allow max 2 chunks per single document to maintain diverse retrieval
      if (docCount >= 2) continue;
      seenDocuments.set(knowledgeId, docCount + 1);

      filtered.push({
        knowledgeId,
        title: item.metadata?.title || item.title || 'Untitled',
        type: item.metadata?.type || item.type || 'Note',
        text: item.text,
        score,
        sourceKind: item.metadata?.sourceKind || item.sourceKind || 'text',
        sourceUrl: item.metadata?.sourceUrl || item.sourceUrl,
        chunkIndex: item.chunkIndex,
      });

      if (filtered.length >= limit) break;
    }

    return filtered;
  }

  /**
   * Assembles a strict grounding prompt addressing all 6 RAG scenarios
   */
  buildGroundedPrompt(
    question: string,
    chunks: RetrievedChunk[],
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): { systemInstruction: string; prompt: string } {
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const systemInstruction = `You are Second Brain's intelligent knowledge assistant, powered by Gemma 4.
Your job is to answer user questions using their personal knowledge library when relevant, while also comfortably answering general questions.

REAL-WORLD TEMPORAL CONTEXT:
- Today's date is ${currentDate} (current time: ${currentTime}).
- When the user asks 'what day is today', 'what is today's date', or asks about current days/times, ALWAYS state this current real-world date accurately.
- Do NOT confuse today's date with dates or deadlines mentioned inside saved notes or historical training cutoffs.

CRITICAL RULES:
1. SAVED KNOWLEDGE QUESTIONS: If the question relates to the provided excerpts from the user's library, answer using those facts and cite the source using [Source 1], [Source 2], etc.
2. GENERAL QUESTIONS: If the user asks a general question (e.g., 'What day is today?', 'What is the capital of Italy?', 'How does QuickSort work?') that has NO meaningful connection to their saved notes, answer thoroughly using your general knowledge and temporal context. DO NOT invent or cite library sources for general facts.
3. HYBRID QUESTIONS: If a question combines user notes with general knowledge, ground the personal parts in the notes and state general facts clearly.
4. MISSING CONTEXT: If the user explicitly asks 'What do my notes say about X?' or 'Did I write about X?' and the provided excerpts DO NOT contain that topic, state honestly: 'Based on your saved notes, you do not have any notes about X.' NEVER fabricate a personal memory.
5. CONTRADICTIONS: If retrieved passages contradict each other, point out the disagreement between the sources rather than arbitrarily picking one.
6. FORMATTING: Use clean, structured Markdown with bolding, lists, and code blocks where helpful. Keep citations cleanly marked as [Source 1], [Source 2].`;

    let contextSection = '';
    if (chunks.length > 0) {
      contextSection = `RELEVANT EXCERPTS FROM USER'S SECOND BRAIN LIBRARY:\n` +
        chunks
          .map(
            (c, i) =>
              `[Source ${i + 1}: "${c.title}" (${c.type})] (Relevance: ${Math.round(c.score * 100)}%)\n${c.text}\n`
          )
          .join('\n---\n\n');
    } else {
      contextSection = `(No relevant notes found in user's library for this query)`;
    }

    let historySection = '';
    if (conversationHistory && conversationHistory.length > 0) {
      historySection = `RECENT CONVERSATION HISTORY:\n` +
        conversationHistory
          .slice(-4)
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n\n') + '\n\n---\n\n';
    }

    const prompt = `${contextSection}\n\n${historySection}USER QUESTION:\n${question}\n\nRESPONSE:`;

    return { systemInstruction, prompt };
  }

  /**
   * Automatically attempts to create the Atlas Vector Search index if missing
   */
  async ensureVectorIndex(): Promise<void> {
    try {
      const collection = KnowledgeChunk.collection;
      const indexes = await collection.listSearchIndexes().toArray();
      const hasVectorIndex = indexes.some((idx: any) => idx.name === 'vector_index');

      if (!hasVectorIndex) {
        console.log('Creating Atlas Vector Search index "vector_index" on knowledgechunks...');
        await (collection as any).createSearchIndex({
          name: 'vector_index',
          type: 'vectorSearch',
          definition: {
            fields: [
              {
                type: 'vector',
                path: 'embedding',
                numDimensions: 768,
                similarity: 'cosine',
              },
              {
                type: 'filter',
                path: 'userId',
              },
            ],
          },
        });
        console.log('Atlas Vector Search index "vector_index" creation initiated.');
      }
    } catch (err: any) {
      console.warn('Notice: Could not automatically register Atlas Search index via driver:', err.message);
      console.info('Tip: You can register "vector_index" on collection "knowledgechunks" in the Atlas Search UI.');
    }
  }
}

export const ragService = new RAGService();
