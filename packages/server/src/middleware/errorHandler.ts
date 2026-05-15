/**
 * packages/server/src/middleware/errorHandler.ts
 */

import { Request, Response, NextFunction } from 'express';
import { Monitoring } from '../utils/monitoring';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isProd = process.env.NODE_ENV === 'production';

  Monitoring.error({
    event: 'unhandled_error',
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err?.message ?? 'Unknown error',
    stack: isProd ? undefined : err?.stack,
  });

  if (err instanceof AppError) {
    res.status(statusCode).json({
      success: false,
      error: err.message,
      requestId: req.requestId,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: isProd ? 'Internal Server Error' : err.message,
    requestId: req.requestId,
  });
}