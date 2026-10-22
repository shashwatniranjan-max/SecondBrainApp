import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Knowledge } from '../models/Knowledge';
import { addKnowledgeSchema } from '../validators/knowledgeValidator';
import { sendSuccess, sendError } from '../utils/response';
import { ragService } from '../services/rag.service';
import { geminiService, ImageAnalysisResult } from '../services/gemini.service';
import { r2Service } from '../services/r2Service';
import {
  detectMagicBytes,
  MAX_IMAGE_FILE_SIZE,
  MAX_PDF_FILE_SIZE,
} from '../utils/fileValidation';

const formatKnowledgeDoc = (k: any) => ({
  id: k._id.toString(),
  title: k.title,
  description: k.description,
  type: k.type,
  tags: k.tags,
  dateAdded: k.dateAdded.toDateString(),
  source: k.source?.url || k.source?.originalName || k.source?.kind,
  sourceUrl: k.source?.objectKey ? `/api/knowledge/file/${k._id}` : k.source?.url,
  readingTime: k.readingTime,
  progress: k.progress,
  content: k.content,
  keyIdeas: k.keyIdeas,
  accent: k.accent,
  analysisStatus: k.analysisStatus,
  embeddingStatus: k.embeddingStatus,
  chunkCount: k.chunkCount,
});

// GET /api/knowledge
export const getKnowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const knowledge = await Knowledge.find({ userId }).sort({ createdAt: -1 });
    
    const formatted = knowledge.map(formatKnowledgeDoc);

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

    const formatted = knowledge.map(formatKnowledgeDoc);

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

    const formatted = formatKnowledgeDoc(k);

    return sendSuccess(res, formatted);
  } catch (error) {
    next(error);
  }
};

// POST /api/knowledge/analyze-image
export const analyzeImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (!req.file || !req.file.buffer) {
      return sendError(res, 'No image file provided', 400);
    }

    if (req.file.size > MAX_IMAGE_FILE_SIZE) {
      return sendError(res, 'Image file exceeds maximum limit of 15MB', 400);
    }

    const detected = detectMagicBytes(req.file.buffer);
    if (!detected || detected.category !== 'image') {
      return sendError(
        res,
        'Invalid or unsupported image file. Only genuine JPEG, PNG, and WebP images are supported.',
        400
      );
    }

    const analysis = await geminiService.analyzeImage(req.file.buffer, detected.mimeType);

    return sendSuccess(res, analysis);
  } catch (error) {
    next(error);
  }
};

// POST /api/knowledge
export const addKnowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }
    
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
      youtube: 'Article',
      image: 'Image',
    };

    const sourceKind =
      validatedData.mode === 'url'
        ? 'url'
        : validatedData.mode === 'upload'
          ? 'upload'
          : validatedData.mode === 'youtube'
            ? 'youtube'
            : validatedData.mode === 'image'
              ? 'image'
              : 'text';

    // Set file path if uploaded
    let fileUrl: string | undefined = undefined;
    let originalName: string | undefined = undefined;
    let objectKey: string | undefined = undefined;
    let mimeType: string | undefined = undefined;
    let size: number | undefined = undefined;
    let finalTitle = (validatedData.title || '').trim();
    let finalDescription = (validatedData.description || '').trim();
    let finalContent = validatedData.content || '';
    let finalKeyIdeas: string[] = ['Ready for review', 'Available in your knowledge library'];
    let finalTags = [...validatedData.tags];

    let analysisStatus: 'pending' | 'completed' | 'failed' | undefined = undefined;

    if (validatedData.mode === 'image') {
      if (req.file) {
        if (req.file.size > MAX_IMAGE_FILE_SIZE) {
          return sendError(res, 'Image file exceeds maximum limit of 15MB', 400);
        }

        const detected = detectMagicBytes(req.file.buffer);
        if (!detected || detected.category !== 'image') {
          return sendError(
            res,
            'Invalid or unsupported image file. Only genuine JPEG, PNG, and WebP images are supported.',
            400
          );
        }

        originalName = req.file.originalname;
        mimeType = detected.mimeType;
        size = req.file.size;
        objectKey = `users/${userId}/knowledge/${uuidv4()}.${detected.extension}`;

        // Upload original image to Cloudflare R2
        try {
          await r2Service.uploadFile(req.file.buffer, objectKey, mimeType);
        } catch (r2Err: any) {
          console.warn('R2 image upload warning:', r2Err.message);
        }

        // Check if pre-analyzed metadata was passed from Add Knowledge UI preview
        let analysis: ImageAnalysisResult | null = null;
        if (req.body.imageMetadata) {
          try {
            analysis =
              typeof req.body.imageMetadata === 'string'
                ? JSON.parse(req.body.imageMetadata)
                : req.body.imageMetadata;
          } catch (e) {}
        }

        if (analysis) {
          // Pre-analysis was explicitly performed before saving
          analysisStatus = 'completed';
          const formattedMarkdown = geminiService.formatImageAnalysisAsMarkdown(analysis);
          finalContent = formattedMarkdown;
          if (analysis.keyConcepts && analysis.keyConcepts.length > 0) {
            finalKeyIdeas = analysis.keyConcepts;
            finalTags = [...new Set([...finalTags, ...analysis.keyConcepts.slice(0, 4)])];
          }
          if (!finalTitle) {
            finalTitle = analysis.summary.slice(0, 50).replace(/\.[^.]*$/, '') || originalName;
          }
          if (!finalDescription) {
            finalDescription = analysis.summary;
          }
        } else {
          // Saving image without analysis (fast path: no AI model call, no fabricated descriptions)
          analysisStatus = 'pending';
          finalContent = finalContent || '';
          finalKeyIdeas = [];
          if (!finalTitle) {
            finalTitle = originalName ? originalName.replace(/\.[^/.]+$/, '') : 'Uploaded Image';
          }
        }
      } else if (!finalContent) {
        return sendError(res, 'Image file is required for image mode', 400);
      }
    } else if (validatedData.mode === 'upload' && req.file) {
      if (req.file.size > MAX_PDF_FILE_SIZE) {
        return sendError(res, 'PDF file exceeds maximum limit of 25MB', 400);
      }

      const detected = detectMagicBytes(req.file.buffer);
      if (!detected || detected.mimeType !== 'application/pdf') {
        return sendError(res, 'Uploaded document is not a valid PDF file.', 400);
      }

      originalName = req.file.originalname;
      mimeType = req.file.mimetype;
      size = req.file.size;

      const safeFilename = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      objectKey = `users/${userId}/knowledge/${uuidv4()}-${safeFilename}`;

      await r2Service.uploadFile(req.file.buffer, objectKey, mimeType);
    } else if (validatedData.mode === 'url') {
      fileUrl = validatedData.content;
    } else if (validatedData.mode === 'youtube') {
      fileUrl = validatedData.originalUrl;
      originalName = 'YouTube Transcript';
    } else if (validatedData.mode === 'upload') {
      originalName = 'Uploaded document';
    } else {
      originalName = 'Pasted text';
    }

    if (!finalTitle) {
      finalTitle = originalName || 'New Knowledge';
    }

    const k = await Knowledge.create({
      userId,
      title: finalTitle,
      description: finalDescription || (validatedData.mode === 'image' ? '' : 'New knowledge ready to explore.'),
      type: (typeMapping[validatedData.mode] || 'Note') as any,
      tags: finalTags,
      source: {
        kind: sourceKind,
        url: fileUrl,
        originalName: originalName,
        objectKey: objectKey,
        mimeType: mimeType,
        size: size,
      },
      content: finalContent
        ? [finalContent]
        : validatedData.mode === 'image'
          ? []
          : ['Your new knowledge has been processed.'],
      keyIdeas: finalKeyIdeas,
      readingTime: Math.ceil((finalContent?.length || 1000) / 1000),
      accent: (['blue', 'lavender', 'mint'][Math.floor(Math.random() * 3)]) as any,
      analysisStatus,
      embeddingStatus: 'pending',
    });

    // Only trigger indexing if textual content is available (not for unanalyzed images)
    if (k.type !== 'Image' || k.analysisStatus === 'completed') {
      setImmediate(() => {
        ragService.indexKnowledge(k._id).catch((err: any) => {
          console.error(`Background indexing error for ${k._id}:`, err.message);
        });
      });
    }

    const formatted = formatKnowledgeDoc(k);
    return sendSuccess(res, formatted, 201);
  } catch (error) {
    next(error);
  }
};

// POST /api/knowledge/:id/analyze
export const analyzeSavedKnowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { id } = req.params;
    const k = await Knowledge.findOne({ _id: id, userId });
    if (!k) {
      return sendError(res, 'Knowledge item not found', 404);
    }

    if (k.type !== 'Image' || !k.source?.objectKey) {
      return sendError(res, 'Target item is not an image stored in R2', 400);
    }

    try {
      console.log(`[Image Analysis] Analyzing saved image ${id} from R2 key ${k.source.objectKey}...`);
      const buffer = await r2Service.getFileBuffer(k.source.objectKey);
      const mimeType = k.source.mimeType || 'image/jpeg';

      const analysis = await geminiService.analyzeImage(buffer, mimeType);
      const formattedMarkdown = geminiService.formatImageAnalysisAsMarkdown(analysis);

      k.content = [formattedMarkdown];
      if (analysis.keyConcepts && analysis.keyConcepts.length > 0) {
        k.keyIdeas = analysis.keyConcepts;
        k.tags = [...new Set([...(k.tags || []), ...analysis.keyConcepts.slice(0, 4)])];
      }
      if (!k.description || k.description.trim() === '') {
        k.description = analysis.summary;
      }
      k.readingTime = Math.ceil(formattedMarkdown.length / 1000);
      k.analysisStatus = 'completed';
      await k.save();

      // Trigger RAG indexing now that structured text has been extracted
      await ragService.indexKnowledge(k._id);

      const formatted = formatKnowledgeDoc(k);
      return sendSuccess(res, formatted);
    } catch (analysisErr: any) {
      console.error(`[Image Analysis] Failed for ${id}:`, analysisErr.message);
      k.analysisStatus = 'failed';
      await k.save();
      return sendError(
        res,
        `Image analysis failed: ${analysisErr.message || 'Please retry later.'}`,
        500
      );
    }
  } catch (error) {
    next(error);
  }
};

// DELETE /api/knowledge/:id
export const deleteKnowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const id = String(req.params.id);

    const k = await Knowledge.findOne({ _id: id, userId });
    
    if (!k) {
      return sendError(res, 'Knowledge not found', 404);
    }

    // Delete from R2 if it's an uploaded file
    if (k.source.objectKey) {
      await r2Service.deleteFile(k.source.objectKey).catch((r2Err) => {
        console.warn('R2 file delete warning:', r2Err.message);
      });
    }

    // Cascade delete vector chunks from KnowledgeChunk collection
    await ragService.deleteKnowledgeChunks(id);

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

    const presignedUrl = await r2Service.getPresignedUrl(k.source.objectKey);
    
    return sendSuccess(res, { url: presignedUrl });
  } catch (error) {
    next(error);
  }
};
