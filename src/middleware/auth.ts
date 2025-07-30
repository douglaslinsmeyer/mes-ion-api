import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/index';
import logger from '../utils/logger';
import { cache } from '../cache/index';
import { recordCacheOperation } from '../utils/metrics';

export interface AuthenticatedRequest extends Request {
  apiKey?: string;
  clientId?: string;
  permissions?: string[];
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// In-memory store for API keys (in production, this would be in a database)
const API_KEYS = new Map<string, { clientId: string; name: string; permissions: string[] }>();

// Initialize with some default API keys for development
if (config.isDevelopment) {
  API_KEYS.set(hashApiKey('dev-api-key-mes-workflow'), {
    clientId: 'mes-workflow-api',
    name: 'MES Workflow API',
    permissions: ['*'],
  });
  API_KEYS.set(hashApiKey('dev-api-key-mes-ui'), {
    clientId: 'mes-workflow-ui',
    name: 'MES Workflow UI',
    permissions: ['*'],
  });
}

function hashApiKey(apiKey: string): string {
  return crypto
    .createHash('sha256')
    .update(apiKey + config.apiKeySalt)
    .digest('hex');
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new AuthenticationError('API key required');
    }

    // Check cache first
    const cacheKey = cache.key('auth', 'api-key', hashApiKey(apiKey));
    const cachedAuth = await cache.get<{ clientId: string; name: string }>(cacheKey);

    if (cachedAuth) {
      req.apiKey = apiKey;
      req.clientId = cachedAuth.clientId;
      recordCacheOperation('get', true);
      return next();
    }
    
    recordCacheOperation('get', false);

    // Validate API key
    const hashedKey = hashApiKey(apiKey);
    const keyInfo = API_KEYS.get(hashedKey);

    if (!keyInfo) {
      logger.warn('Invalid API key attempt', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw new AuthenticationError('Invalid API key');
    }

    // Cache the successful authentication
    await cache.set(
      cacheKey,
      { clientId: keyInfo.clientId, name: keyInfo.name },
      { ttlSeconds: 300 }, // 5 minutes
    );

    // Add auth info to request
    req.apiKey = apiKey;
    req.clientId = keyInfo.clientId;
    req.permissions = keyInfo.permissions;

    logger.debug('API key authenticated', {
      clientId: keyInfo.clientId,
      name: keyInfo.name,
    });
    
    recordCacheOperation('set', true);

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: error.message,
        },
      });
    } else {
      next(error);
    }
  }
};

// Helper function to generate new API keys
export function generateApiKey(): string {
  const prefix = 'msk_'; // MES Key
  const random = crypto.randomBytes(32).toString('base64url');
  return `${prefix}${random}`;
}

// Helper function to register a new API key (would be used by an admin endpoint)
export function registerApiKey(
  apiKey: string,
  clientId: string,
  name: string,
  permissions: string[] = ['*'],
): void {
  const hashedKey = hashApiKey(apiKey);
  API_KEYS.set(hashedKey, { clientId, name, permissions });
  logger.info('New API key registered', { clientId, name });
}