import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ShareLink } from '../models/ShareLink';
import { Knowledge } from '../models/Knowledge';
import { User } from '../models/User';
import { sendSuccess, sendError } from '../utils/response';

export const createShareLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    
    // Check if user already has an active link
    let link = await ShareLink.findOne({ userId });

    if (!link) {
      const token = crypto.randomBytes(16).toString('hex');
      link = await ShareLink.create({
        userId,
        token,
        enabled: true,
      });
    } else {
      // Re-enable if disabled
      link.enabled = true;
      await link.save();
    }

    return sendSuccess(res, {
      id: link._id,
      token: link.token,
      enabled: link.enabled,
      url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/share/${link.token}`
    });
  } catch (error) {
    next(error);
  }
};

export const getShareLinks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const links = await ShareLink.find({ userId });
    
    return sendSuccess(res, links.map(link => ({
      id: link._id,
      token: link.token,
      enabled: link.enabled,
      url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/share/${link.token}`
    })));
  } catch (error) {
    next(error);
  }
};

export const toggleShareLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { enabled } = req.body;

    const link = await ShareLink.findOne({ _id: id, userId });
    if (!link) {
      return sendError(res, 'Share link not found', 404);
    }

    link.enabled = enabled;
    await link.save();

    return sendSuccess(res, {
      id: link._id,
      token: link.token,
      enabled: link.enabled
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicSharedKnowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    const link = await ShareLink.findOne({ token });
    if (!link || !link.enabled) {
      return sendError(res, 'Invalid or disabled share link', 404);
    }

    // Optionally check expiry here
    
    // Get the owner's public info
    const user = await User.findById(link.userId);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Get the knowledge
    const knowledge = await Knowledge.find({ userId: link.userId }).sort({ createdAt: -1 });

    const formatted = knowledge.map(k => ({
      id: k._id.toString(),
      title: k.title,
      description: k.description,
      type: k.type,
      tags: k.tags,
      dateAdded: k.dateAdded.toDateString(),
      readingTime: k.readingTime,
      accent: k.accent,
      // We might exclude content/source for public view, or include it depending on requirements.
      // For read-only, it should be fine.
      content: k.content,
      keyIdeas: k.keyIdeas,
    }));

    return sendSuccess(res, {
      author: user.name,
      knowledge: formatted
    });

  } catch (error) {
    next(error);
  }
};
