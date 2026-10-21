import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { BrainQuery } from '../models/BrainQuery';
import { sendSuccess, sendError } from '../utils/response';
import { ragService } from '../services/rag.service';
import { geminiService } from '../services/gemini.service';
import { z } from 'zod';

const askSchema = z.object({
  question: z.string().min(1, 'Question is required').max(1000, 'Question too long'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
});

export const askBrain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { question, conversationHistory } = askSchema.parse(req.body);

    // 1. Vector Search for relevant chunks with strict 0.65 true-cosine threshold
    let retrievedChunks: any[] = [];
    try {
      retrievedChunks = await ragService.searchSimilarChunks(userId, question, 4, 0.65);
    } catch (searchError: any) {
      console.warn('Vector search notice (Atlas/Embedding):', searchError.message);
    }

    // 2. Build the grounded prompt with intent gating (Saved Notes, General, Hybrid, Missing)
    const { systemInstruction, prompt } = ragService.buildGroundedPrompt(
      question,
      retrievedChunks,
      conversationHistory
    );

    // 3. Generate grounded answer with Gemma 4 via Gemini API
    let answerText: string;
    try {
      answerText = await geminiService.generateAnswer(systemInstruction, prompt);
    } catch (modelError: any) {
      console.error('Answer generation error:', modelError.message);
      // Fallback message if API key missing or external model failure
      if (modelError.message?.includes('GEMINI_API_KEY')) {
        answerText = '⚠️ **GEMINI_API_KEY is not configured on your server.**\n\nPlease add `GEMINI_API_KEY` to the Environment Variables in your Render Dashboard settings.';
      } else if (retrievedChunks.length > 0) {
        answerText = `I found relevant information in your notes on **${retrievedChunks[0].title}**, but could not complete the AI generation: ${modelError.message}`;
      } else {
        answerText = `Could not reach the generation model: ${modelError.message}. Please check that your GEMINI_API_KEY is configured.`;
      }
    }

    // 4. Map real sources and real similarity scores (0-100)
    const sources = retrievedChunks
      .filter((c) => c.knowledgeId && mongoose.Types.ObjectId.isValid(c.knowledgeId))
      .map((c) => ({
        knowledgeId: new mongoose.Types.ObjectId(c.knowledgeId),
        title: c.title,
        excerpt: c.text && c.text.length > 180 ? `${c.text.substring(0, 180)}...` : (c.text || ''),
        relevance: Math.min(100, Math.round((c.score || 0) * 100)),
      }));

    const uniqueKnowledgeIds = [
      ...new Set(sources.map((s) => s.knowledgeId)),
    ];

    // 5. Context-aware suggested follow-up questions
    const suggestedQuestions: string[] = [];
    if (retrievedChunks.length > 0) {
      suggestedQuestions.push(`Can you elaborate on ${retrievedChunks[0].title}?`);
      suggestedQuestions.push(`What other topics connect to this in my notes?`);
      suggestedQuestions.push(`Summarize the key takeaways`);
    } else {
      suggestedQuestions.push('What topics are currently in my library?');
      suggestedQuestions.push('How can I organize my second brain notes?');
      suggestedQuestions.push('Give me 3 productivity tips');
    }

    // 6. Persist to BrainQuery collection for real query history
    const brainQuery = await BrainQuery.create({
      userId: new mongoose.Types.ObjectId(userId),
      question,
      answer: answerText,
      sources,
      relatedKnowledgeIds: uniqueKnowledgeIds,
      suggestedQuestions,
    });

    const formattedAnswer = {
      id: brainQuery._id.toString(),
      question: brainQuery.question,
      answer: brainQuery.answer,
      sources: brainQuery.sources.map((s) => ({
        knowledgeId: s.knowledgeId.toString(),
        title: s.title,
        excerpt: s.excerpt,
        relevance: s.relevance,
      })),
      relatedKnowledgeIds: brainQuery.relatedKnowledgeIds.map((id) => id.toString()),
      suggestedQuestions: brainQuery.suggestedQuestions,
      createdAt: brainQuery.createdAt,
    };

    return sendSuccess(res, formattedAnswer);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ask/history
 * Returns the user's past question & answer sessions
 */
export const getAskHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const history = await BrainQuery.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const formatted = history.map((q) => ({
      id: q._id.toString(),
      question: q.question,
      answer: q.answer,
      sources: (q.sources || []).map((s) => ({
        knowledgeId: s.knowledgeId?.toString() || '',
        title: s.title,
        excerpt: s.excerpt,
        relevance: s.relevance,
      })),
      relatedKnowledgeIds: (q.relatedKnowledgeIds || []).map((id) => id.toString()),
      suggestedQuestions: q.suggestedQuestions || [],
      createdAt: (q as any).createdAt,
    }));

    return sendSuccess(res, formatted);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/ask/history/:id
 * Removes a specific query from history
 */
export const deleteAskQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const id = String(req.params.id);

    await BrainQuery.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });

    return sendSuccess(res, { message: 'Query deleted successfully' });
  } catch (error) {
    next(error);
  }
};
