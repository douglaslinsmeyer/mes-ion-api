import { Request, Response, NextFunction } from 'express';
import { AppError } from './utils/errors';
import logger from './utils/logger';
import { config } from './config/index';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
  
  // Log error
  logger.error('Request error:', {
    error: err.message,
    code,
    statusCode,
    stack: config.isDevelopment ? err.stack : undefined,
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'],
  });

  // Send error response
  res.status(statusCode).json({
    error: {
      code,
      message: err.message,
      ...(config.isDevelopment && { stack: err.stack }),
      ...(isAppError && err.details && { details: err.details }),
    },
  });
};