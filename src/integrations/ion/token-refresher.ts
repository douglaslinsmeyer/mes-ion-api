import { IONAuthManager } from './auth';
import logger from '../../utils/logger';
import { cache } from '../../cache/index';
import { recordTokenRefresh } from '../../utils/metrics';

export interface TokenRefresherOptions {
  /** Minimum time before expiration to trigger refresh (in seconds) */
  refreshBeforeExpiry?: number;
  /** Interval to check for token expiration (in milliseconds) */
  checkInterval?: number;
  /** Whether to start the refresher immediately */
  autoStart?: boolean;
}

export class TokenRefresher {
  private authManager: IONAuthManager;
  private refreshBeforeExpiry: number;
  private checkInterval: number;
  private intervalId?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private readonly cacheKey = 'ion:oauth:token';

  constructor(authManager: IONAuthManager, options: TokenRefresherOptions = {}) {
    this.authManager = authManager;
    this.refreshBeforeExpiry = options.refreshBeforeExpiry || 300; // 5 minutes default
    this.checkInterval = options.checkInterval || 60000; // 1 minute default

    if (options.autoStart) {
      this.start();
    }
  }

  /**
   * Start the background token refresher
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Token refresher is already running');
      return;
    }

    logger.info('Starting ION token refresher', {
      refreshBeforeExpiry: this.refreshBeforeExpiry,
      checkInterval: this.checkInterval,
    });

    this.isRunning = true;
    
    // Run immediately on start
    this.checkAndRefreshToken().catch(error => {
      logger.error('Error during initial token refresh check', error);
    });

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkAndRefreshToken().catch(error => {
        logger.error('Error during token refresh check', error);
      });
    }, this.checkInterval);
  }

  /**
   * Stop the background token refresher
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping ION token refresher');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.isRunning = false;
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  private async checkAndRefreshToken(): Promise<void> {
    try {
      const cachedToken = await cache.get<{ token: string; expiresAt: number }>(this.cacheKey);
      
      if (!cachedToken) {
        logger.debug('No cached token found, skipping refresh check');
        return;
      }

      const now = Date.now();
      const timeUntilExpiry = (cachedToken.expiresAt - now) / 1000; // Convert to seconds
      
      logger.debug('Token expiry check', {
        expiresAt: new Date(cachedToken.expiresAt).toISOString(),
        timeUntilExpiry: Math.round(timeUntilExpiry),
        refreshThreshold: this.refreshBeforeExpiry,
      });

      if (timeUntilExpiry <= this.refreshBeforeExpiry) {
        logger.info('Token expiring soon, refreshing proactively', {
          timeUntilExpiry: Math.round(timeUntilExpiry),
        });

        // Clear the current token to force a refresh
        await this.authManager.clearToken();
        
        // Request new token
        const newToken = await this.authManager.getAccessToken();
        
        logger.info('Token refreshed successfully', {
          tokenPreview: newToken.substring(0, 10) + '...',
        });
        
        recordTokenRefresh('proactive', true);
      }
    } catch (error) {
      logger.error('Failed to refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      recordTokenRefresh('proactive', false);
      
      // Don't throw - we want the refresher to continue running
      // The next API call will handle the token refresh if needed
    }
  }

  /**
   * Manually trigger a token refresh check
   */
  async refreshNow(): Promise<void> {
    logger.info('Manually triggering token refresh');
    try {
      await this.checkAndRefreshToken();
      recordTokenRefresh('manual', true);
    } catch (error) {
      recordTokenRefresh('manual', false);
      throw error;
    }
  }

  /**
   * Get the current status of the refresher
   */
  getStatus(): {
    isRunning: boolean;
    refreshBeforeExpiry: number;
    checkInterval: number;
  } {
    return {
      isRunning: this.isRunning,
      refreshBeforeExpiry: this.refreshBeforeExpiry,
      checkInterval: this.checkInterval,
    };
  }
}

// Singleton instance
let tokenRefresher: TokenRefresher | null = null;

/**
 * Initialize and start the token refresher
 */
export function initializeTokenRefresher(
  authManager: IONAuthManager,
  options?: TokenRefresherOptions
): TokenRefresher {
  if (tokenRefresher) {
    logger.warn('Token refresher already initialized');
    return tokenRefresher;
  }

  tokenRefresher = new TokenRefresher(authManager, {
    ...options,
    autoStart: true,
  });

  return tokenRefresher;
}

/**
 * Get the current token refresher instance
 */
export function getTokenRefresher(): TokenRefresher | null {
  return tokenRefresher;
}

/**
 * Stop and cleanup the token refresher
 */
export function stopTokenRefresher(): void {
  if (tokenRefresher) {
    tokenRefresher.stop();
    tokenRefresher = null;
  }
}