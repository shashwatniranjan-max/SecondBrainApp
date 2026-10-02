import { Request, Response, NextFunction } from 'express';
import { Knowledge } from '../models/Knowledge';
import { BrainQuery } from '../models/BrainQuery';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

const askSchema = z.object({
  question: z.string().min(1, 'Question is required'),
});

export const askBrain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { question } = askSchema.parse(req.body);

    // V1: Basic text search to mock RAG retrieval
    const queryWords = question.toLowerCase().split(' ');
    const regexPattern = queryWords.join('|');
    
    // Find somewhat relevant knowledge (mocking retrieval)
    const relevantKnowledge = await Knowledge.find({
      userId,
      $or: [
        { title: { $regex: regexPattern, $options: 'i' } },
        { description: { $regex: regexPattern, $options: 'i' } },
        { content: { $regex: regexPattern, $options: 'i' } },
        { tags: { $regex: regexPattern, $options: 'i' } }
      ]
    }).limit(3);

    // V1: Mock Answer generation
    let answerText = "I searched your knowledge base but couldn't find a direct answer.";
    let sources: any[] = [];
    let relatedKnowledgeIds: any[] = [];

    if (relevantKnowledge.length > 0) {
      answerText = `Based on your notes, here is what I found regarding "${question}". I found relevant information in ${relevantKnowledge.length} of your documents.`;
      
      sources = relevantKnowledge.map((k, index) => ({
        knowledgeId: k._id,
        title: k.title,
        excerpt: k.content.length > 0 ? k.content[0].substring(0, 100) + '...' : k.description,
        relevance: 95 - (index * 5), // Mock relevance score
      }));

      relatedKnowledgeIds = relevantKnowledge.map(k => k._id);
    }

    // Save the query for history
    const brainQuery = await BrainQuery.create({
      userId,
      question,
      answer: answerText,
      sources,
      relatedKnowledgeIds,
      suggestedQuestions: [
        "Can you elaborate on this?",
        "What related topics do I have?",
        "Summarize this further"
      ]
    });

    const formattedAnswer = {
      id: brainQuery._id.toString(),
      question: brainQuery.question,
      answer: brainQuery.answer,
      sources: brainQuery.sources.map(s => ({
        knowledgeId: s.knowledgeId.toString(),
        title: s.title,
        excerpt: s.excerpt,
        relevance: s.relevance,
      })),
      relatedKnowledgeIds: brainQuery.relatedKnowledgeIds.map(id => id.toString()),
      suggestedQuestions: brainQuery.suggestedQuestions,
    };

    return sendSuccess(res, formattedAnswer);
  } catch (error) {
    next(error);
  }
};
