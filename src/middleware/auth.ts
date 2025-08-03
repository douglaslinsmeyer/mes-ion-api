import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  clientId?: string;
}

// Simple pass-through middleware that adds client identification from headers
export const authMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  // Extract optional client ID from headers for tracking purposes
  const clientId = req.headers['x-client-id'] as string;
  
  if (clientId) {
    req.clientId = clientId;
    logger.debug('Request identified', { clientId });
  }
  
  // No authentication required - pass through
  next();
};