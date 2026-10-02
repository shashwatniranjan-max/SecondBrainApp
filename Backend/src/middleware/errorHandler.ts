import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: (err as any).errors,
    });
  }

  if (err.name === 'ValidationError') {
    return sendError(res, err.message, 400);
  }

  if (err.name === 'CastError') {
    return sendError(res, 'Invalid ID format', 400);
  }

  return sendError(res, 'Internal Server Error', 500);
};
