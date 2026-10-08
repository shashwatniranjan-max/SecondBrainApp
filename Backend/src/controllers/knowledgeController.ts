import { Request, Response, NextFunction } from 'express';
import { Knowledge } from '../models/Knowledge';
import { addKnowledgeSchema } from '../validators/knowledgeValidator';
import { sendSuccess, sendError } from '../utils/response';

// GET /api/knowledge
export const getKnowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const knowledge = await Knowledge.find({ userId }).sort({ createdAt: -1 });
    
    // Map to match frontend format if necessary, though Mongoose returns JSON well
    const formatted = knowledge.map(k => ({
      id: k._id.toString(),
      title: k.title,
      description: k.description,
      type: k.type,
      tags: k.tags,
      dateAdded: k.dateAdded.toDateString(),
      source: k.source.url || k.source.originalName || k.source.kind,
      sourceUrl: k.source.objectKey ? `/api/knowledge/file/${k._id}` : k.source.url,
      readingTime: k.readingTime,
      progress: k.progress,
      content: k.content,
      keyIdeas: k.keyIdeas,
      accent: k.accent,
    }));

    return sendSuccess(res, formatted);
  } catch (error) {
    next(error);
  }
};

// GET /api/knowledge/search?q=...
export const searchKnowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return getKnowledge(req, res, next);
    }

    const value = q.trim().toLowerCase();
    
    // Text search or regex
    const knowledge = await Knowledge.find({
      userId,
      $text: { $search: value }
    }).sort({ score: { $meta: 'textScore' } });

    // Fallback if text index doesn't yield results (or we can just use regex for simple search)
    // For V1, regex might be more forgiving for partial matches without full text setup
    /*
    const knowledge = await Knowledge.find({
      userId,
      $or: [
        { title: { $regex: value, $options: 'i' } },
        { description: { $regex: value, $options: 'i' } },
        { tags: { $regex: value, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });
    */

    const formatted = knowledge.map(k => ({
      id: k._id.toString(),
      title: k.title,
      description: k.description,
      type: k.type,
      tags: k.tags,
      dateAdded: k.dateAdded.toDateString(),
      source: k.source.url || k.source.originalName || k.source.kind,
      sourceUrl: k.source.objectKey ? `/api/knowledge/file/${k._id}` : k.source.url,
      readingTime: k.readingTime,
      progress: k.progress,
      content: k.content,
      keyIdeas: k.keyIdeas,
      accent: k.accent,
    }));

    return sendSuccess(res, formatted);
  } catch (error) {
    next(error);
  }
};

// GET /api/knowledge/:id
export const getKnowledgeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const k = await Knowledge.findOne({ _id: id, userId });
    if (!k) {
      return sendError(res, 'Knowledge not found', 404);
    }

    const formatted = {
      id: k._id.toString(),
      title: k.title,
      description: k.description,
      type: k.type,
      tags: k.tags,
      dateAdded: k.dateAdded.toDateString(),
      source: k.source.url || k.source.originalName || k.source.kind,
      sourceUrl: k.source.objectKey ? `/api/knowledge/file/${k._id}` : k.source.url,
      readingTime: k.readingTime,
      progress: k.progress,
      content: k.content,
      keyIdeas: k.keyIdeas,
      accent: k.accent,
    };

    return sendSuccess(res, formatted);
  } catch (error) {
    next(error);
  }
};

// POST /api/knowledge
export const addKnowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    
    // Parse tags if sent via multipart/form-data
    if (typeof req.body.tags === 'string') {
      try {
        req.body.tags = JSON.parse(req.body.tags);
      } catch (e) {
        // Leave as is if parsing fails, Zod will complain
      }
    }

    const validatedData = addKnowledgeSchema.parse(req.body);

    const typeMapping: Record<string, string> = {
      url: 'URL',
      upload: 'PDF',
      text: 'Note',
      youtube: 'Article'
    };

    const sourceKind = validatedData.mode === 'url' ? 'url' : 
                      validatedData.mode === 'upload' ? 'upload' : 
                      validatedData.mode === 'youtube' ? 'youtube' : 'text';

    // Set file path if uploaded
    let fileUrl = undefined;
    let originalName = undefined;
    let objectKey = undefined;
    let mimeType = undefined;
    let size = undefined;
    
    if (validatedData.mode === 'upload' && req.file) {
      originalName = req.file.originalname;
      mimeType = req.file.mimetype;
      size = req.file.size;
      
      const { v4: uuidv4 } = require('uuid');
      const safeFilename = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      objectKey = `users/${userId}/knowledge/${uuidv4()}-${safeFilename}`;
      
      // Upload to Cloudflare R2
      const { r2Service } = require('../services/r2Service');
      await r2Service.uploadPdf(req.file.buffer, objectKey, mimeType);
      
    } else if (validatedData.mode === 'url') {
      fileUrl = validatedData.content;
    } else if (validatedData.mode === 'youtube') {
      fileUrl = validatedData.originalUrl;
      originalName = 'YouTube Transcript';
    } else if (validatedData.mode === 'upload') {
       // fallback if file not sent
       originalName = 'Uploaded document';
    } else {
       originalName = 'Pasted text';
    }

    const k = await Knowledge.create({
      userId,
      title: validatedData.title,
      description: validatedData.description || 'New knowledge ready to explore.',
      type: (typeMapping[validatedData.mode] || 'Note') as any,
      tags: validatedData.tags,
      source: {
        kind: sourceKind,
        url: fileUrl,
        originalName: originalName,
        objectKey: objectKey,
        mimeType: mimeType,
        size: size,
      },
      content: [validatedData.content || 'Your new knowledge has been processed.'],
      keyIdeas: ['Ready for review', 'Available in your knowledge library'],
      readingTime: Math.ceil((validatedData.content?.length || 1000) / 1000), // Mock reading time
      accent: (['blue', 'lavender', 'mint'][Math.floor(Math.random() * 3)]) as any,
    });

    const formatted = {
      id: k._id.toString(),
      title: k.title,
      description: k.description,
      type: k.type,
      tags: k.tags,
      dateAdded: k.dateAdded.toDateString(),
      source: k.source.url || k.source.originalName || k.source.kind,
      sourceUrl: k.source.objectKey ? `/api/knowledge/file/${k._id}` : k.source.url,
      readingTime: k.readingTime,
      progress: k.progress,
      content: k.content,
      keyIdeas: k.keyIdeas,
      accent: k.accent,
    };

    return sendSuccess(res, formatted, 201);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/knowledge/:id
export const deleteKnowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const k = await Knowledge.findOne({ _id: id, userId });
    
    if (!k) {
      return sendError(res, 'Knowledge not found', 404);
    }

    // Delete from R2 if it's an uploaded file
    if (k.source.objectKey) {
      const { r2Service } = require('../services/r2Service');
      await r2Service.deletePdf(k.source.objectKey);
    }

    await Knowledge.deleteOne({ _id: id, userId });

    return sendSuccess(res, { message: 'Deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /api/knowledge/file/:id
export const serveUploadedFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    // Verify ownership
    const k = await Knowledge.findOne({ 
      _id: id,
      userId 
    });

    if (!k || !k.source.objectKey) {
      return sendError(res, 'File not found or unauthorized', 404);
    }

    const { r2Service } = require('../services/r2Service');
    const presignedUrl = await r2Service.getPresignedPdfUrl(k.source.objectKey);
    
    return sendSuccess(res, { url: presignedUrl });
  } catch (error) {
    next(error);
  }
};
