import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Unauthorized - No token provided', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
    const decoded = jwt.verify(token, secret) as { id: string };
    
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return sendError(res, 'Unauthorized - Invalid or expired token', 401);
  }
};
