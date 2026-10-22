import { z } from 'zod';

export const addKnowledgeSchema = z.object({
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  mode: z.enum(['upload', 'text', 'url', 'youtube', 'image']),
  content: z.string().optional().default(''),
  originalUrl: z.string().optional(),
  imageMetadata: z.string().optional(),
});
