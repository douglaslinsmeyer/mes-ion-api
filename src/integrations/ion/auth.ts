import axios from 'axios';
import { IONTokenResponse, IONApiError } from './types';
import { config } from '../../config/index';
import { cache } from '../../cache/index';
import logger from '../../utils/logger';
import { IONAPIError } from '../../utils/errors';
import { 
  recordAuthTokenRequest, 
  recordTokenCacheHit, 
  recordTokenCacheMiss,
  updateTokenExpiry,
  authMetrics
} from '../../utils/metrics';
import { AuthErrors, parseOAuthError } from '../../utils/auth-errors';

export class IONAuthManager {
  private readonly cacheKey = 'ion:oauth:token';
  private readonly tokenEndpoint: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly username: string;
  private readonly password: string;

  constructor() {
    this.tokenEndpoint = config.ion.tokenEndpoint;
    this.clientId = config.ion.clientId;
    this.clientSecret = config.ion.clientSecret;
    this.username = config.ion.username;
    this.password = config.ion.password;
    
    // Validate configuration
    if (!this.tokenEndpoint || !this.clientId || !this.clientSecret || !this.username || !this.password) {
      throw AuthErrors.configurationError(
        'Missing required ION configuration (tokenEndpoint, clientId, clientSecret, username, or password)'
      );
    }
  }

  async getAccessToken(): Promise<string> {
    // Check cache first
    const cachedToken = await cache.get<{ token: string; expiresAt: number }>(this.cacheKey);
    
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      logger.debug('Using cached ION access token');
      recordTokenCacheHit();
      
      // Update token expiry metric
      const timeUntilExpiry = (cachedToken.expiresAt - Date.now()) / 1000;
      updateTokenExpiry(timeUntilExpiry);
      
      return cachedToken.token;
    }

    // Cache miss
    recordTokenCacheMiss();
    
    // Request new token
    logger.info('Requesting new ION access token');
    return this.requestNewToken();
  }

  private async requestNewToken(): Promise<string> {
    const startTime = Date.now();
    
    try {
      const response = await axios.post<IONTokenResponse | IONApiError>(
        this.tokenEndpoint,
        new URLSearchParams({
          grant_type: 'password',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          username: this.username,
          password: this.password,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        },
      );

      if ('error' in response.data) {
        const error = response.data as IONApiError;
        throw parseOAuthError(error);
      }

      const tokenData = response.data as IONTokenResponse;
      
      // Calculate expiration time (subtract 60 seconds for safety margin)
      const expiresAt = Date.now() + (tokenData.expires_in - 60) * 1000;

      // Cache the token
      await cache.set(
        this.cacheKey,
        {
          token: tokenData.access_token,
          expiresAt,
        },
        { ttlSeconds: tokenData.expires_in - 60 },
      );

      logger.info('ION access token obtained successfully', {
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope,
      });

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      recordAuthTokenRequest(true, duration);
      updateTokenExpiry(tokenData.expires_in - 60);
      authMetrics.activeTokens.set(1);

      return tokenData.access_token;
    } catch (error) {
      // Record failed metric
      const duration = (Date.now() - startTime) / 1000;
      recordAuthTokenRequest(false, duration);
      
      if (axios.isAxiosError(error)) {
        logger.error('ION OAuth request failed', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        
        // Handle specific error cases
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          throw AuthErrors.networkError(error.message, {
            code: error.code,
            endpoint: this.tokenEndpoint,
          });
        }
        
        if (error.response) {
          throw parseOAuthError(error.response);
        }
        
        throw AuthErrors.networkError(error.message);
      }
      
      throw AuthErrors.unknownError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  async clearToken(): Promise<void> {
    await cache.delete(this.cacheKey);
    logger.info('ION access token cleared from cache');
    authMetrics.activeTokens.set(0);
  }
  
  async getTokenExpiry(): Promise<string | null> {
    const cachedToken = await cache.get<{ token: string; expiresAt: number }>(this.cacheKey);
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return new Date(cachedToken.expiresAt).toISOString();
    }
    return null;
  }
}