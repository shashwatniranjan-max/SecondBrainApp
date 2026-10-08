import { z } from 'zod';

export const addKnowledgeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  mode: z.enum(['upload', 'text', 'url', 'youtube']),
  content: z.string().optional().default(''),
  originalUrl: z.string().optional(),
});
