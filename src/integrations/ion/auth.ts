import axios from 'axios';
import { IONTokenResponse, IONApiError } from './types';
import { config } from '../config/index';
import { cache } from '../cache/index';
import logger from '../utils/logger';
import { IONAPIError } from '../utils/errors';

export class IONAuthManager {
  private readonly cacheKey = 'ion:oauth:token';
  private readonly tokenEndpoint: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    this.tokenEndpoint = config.ion.tokenEndpoint;
    this.clientId = config.ion.clientId;
    this.clientSecret = config.ion.clientSecret;
  }

  async getAccessToken(): Promise<string> {
    // Check cache first
    const cachedToken = await cache.get<{ token: string; expiresAt: number }>(this.cacheKey);
    
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      logger.debug('Using cached ION access token');
      return cachedToken.token;
    }

    // Request new token
    logger.info('Requesting new ION access token');
    return this.requestNewToken();
  }

  private async requestNewToken(): Promise<string> {
    try {
      const response = await axios.post<IONTokenResponse | IONApiError>(
        this.tokenEndpoint,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
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
        throw new IONAPIError(
          `OAuth token request failed: ${error.error}`,
          401,
          {
            description: error.error_description,
            uri: error.error_uri,
          },
        );
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

      return tokenData.access_token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('ION OAuth request failed', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        
        throw new IONAPIError(
          'Failed to obtain ION access token',
          error.response?.status || 500,
          error.response?.data,
        );
      }
      
      throw error;
    }
  }

  async clearToken(): Promise<void> {
    await cache.delete(this.cacheKey);
    logger.info('ION access token cleared from cache');
  }
}