import { TokenRefresher, initializeTokenRefresher, getTokenRefresher, stopTokenRefresher } from './token-refresher';
import { IONAuthManager } from './auth';
import { cache } from '../../cache/index';
import logger from '../../utils/logger';

jest.mock('./auth');
jest.mock('../../cache/index');
jest.mock('../../utils/logger');

describe('TokenRefresher', () => {
  let mockAuthManager: jest.Mocked<IONAuthManager>;
  let tokenRefresher: TokenRefresher;
  const mockCache = cache as jest.Mocked<typeof cache>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockAuthManager = {
      getAccessToken: jest.fn(),
      clearToken: jest.fn(),
    } as any;

    // Reset singleton
    stopTokenRefresher();
  });

  afterEach(() => {
    if (tokenRefresher) {
      tokenRefresher.stop();
    }
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      tokenRefresher = new TokenRefresher(mockAuthManager);
      const status = tokenRefresher.getStatus();
      
      expect(status.refreshBeforeExpiry).toBe(300); // 5 minutes
      expect(status.checkInterval).toBe(60000); // 1 minute
      expect(status.isRunning).toBe(false);
    });

    it('should initialize with custom options', () => {
      tokenRefresher = new TokenRefresher(mockAuthManager, {
        refreshBeforeExpiry: 600,
        checkInterval: 30000,
      });
      const status = tokenRefresher.getStatus();
      
      expect(status.refreshBeforeExpiry).toBe(600);
      expect(status.checkInterval).toBe(30000);
    });

    it('should auto-start if specified', () => {
      tokenRefresher = new TokenRefresher(mockAuthManager, { autoStart: true });
      const status = tokenRefresher.getStatus();
      
      expect(status.isRunning).toBe(true);
    });
  });

  describe('start/stop', () => {
    it('should start the refresher', () => {
      tokenRefresher = new TokenRefresher(mockAuthManager);
      
      tokenRefresher.start();
      
      expect(tokenRefresher.getStatus().isRunning).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'Starting ION token refresher',
        expect.any(Object)
      );
    });

    it('should not start if already running', () => {
      tokenRefresher = new TokenRefresher(mockAuthManager);
      
      tokenRefresher.start();
      tokenRefresher.start(); // Try to start again
      
      expect(logger.warn).toHaveBeenCalledWith('Token refresher is already running');
    });

    it('should stop the refresher', () => {
      tokenRefresher = new TokenRefresher(mockAuthManager);
      
      tokenRefresher.start();
      tokenRefresher.stop();
      
      expect(tokenRefresher.getStatus().isRunning).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('Stopping ION token refresher');
    });

    it('should handle stop when not running', () => {
      tokenRefresher = new TokenRefresher(mockAuthManager);
      
      tokenRefresher.stop(); // Stop without starting
      
      expect(tokenRefresher.getStatus().isRunning).toBe(false);
    });
  });

  describe('token refresh logic', () => {
    it('should refresh token when close to expiry', async () => {
      tokenRefresher = new TokenRefresher(mockAuthManager, {
        refreshBeforeExpiry: 300,
        checkInterval: 60000,
      });

      // Mock token that expires in 4 minutes (240 seconds)
      const expiringToken = {
        token: 'expiring-token',
        expiresAt: Date.now() + 240000, // 4 minutes from now
      };
      mockCache.get.mockResolvedValue(expiringToken);
      mockAuthManager.getAccessToken.mockResolvedValue('new-token');

      tokenRefresher.start();
      
      // Wait for initial check
      await jest.runOnlyPendingTimersAsync();
      
      expect(mockAuthManager.clearToken).toHaveBeenCalled();
      expect(mockAuthManager.getAccessToken).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Token expiring soon, refreshing proactively',
        expect.any(Object)
      );
    });

    it('should not refresh token when not close to expiry', async () => {
      tokenRefresher = new TokenRefresher(mockAuthManager, {
        refreshBeforeExpiry: 300,
        checkInterval: 60000,
      });

      // Mock token that expires in 10 minutes (600 seconds)
      const validToken = {
        token: 'valid-token',
        expiresAt: Date.now() + 600000, // 10 minutes from now
      };
      mockCache.get.mockResolvedValue(validToken);

      tokenRefresher.start();
      
      // Wait for initial check
      await jest.runOnlyPendingTimersAsync();
      
      expect(mockAuthManager.clearToken).not.toHaveBeenCalled();
      expect(mockAuthManager.getAccessToken).not.toHaveBeenCalled();
    });

    it('should skip refresh when no cached token', async () => {
      tokenRefresher = new TokenRefresher(mockAuthManager);
      mockCache.get.mockResolvedValue(null);

      tokenRefresher.start();
      
      // Wait for initial check
      await jest.runOnlyPendingTimersAsync();
      
      expect(mockAuthManager.clearToken).not.toHaveBeenCalled();
      expect(mockAuthManager.getAccessToken).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'No cached token found, skipping refresh check'
      );
    });

    it('should handle refresh errors gracefully', async () => {
      tokenRefresher = new TokenRefresher(mockAuthManager);
      
      const expiringToken = {
        token: 'expiring-token',
        expiresAt: Date.now() + 100000, // Expires soon
      };
      mockCache.get.mockResolvedValue(expiringToken);
      mockAuthManager.getAccessToken.mockRejectedValue(new Error('Network error'));

      tokenRefresher.start();
      
      // Wait for initial check
      await jest.runOnlyPendingTimersAsync();
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh token',
        expect.objectContaining({
          error: 'Network error',
        })
      );
      
      // Should still be running despite error
      expect(tokenRefresher.getStatus().isRunning).toBe(true);
    });

    it('should run periodic checks', async () => {
      tokenRefresher = new TokenRefresher(mockAuthManager, {
        checkInterval: 30000, // 30 seconds
      });
      
      mockCache.get.mockResolvedValue(null);
      
      tokenRefresher.start();
      
      // Run multiple intervals
      await jest.advanceTimersByTimeAsync(30000);
      await jest.advanceTimersByTimeAsync(30000);
      await jest.advanceTimersByTimeAsync(30000);
      
      // Should be called 1 initial + 3 intervals = 4 times
      expect(mockCache.get).toHaveBeenCalledTimes(4);
    });
  });

  describe('manual refresh', () => {
    it('should allow manual token refresh', async () => {
      tokenRefresher = new TokenRefresher(mockAuthManager);
      
      const expiringToken = {
        token: 'expiring-token',
        expiresAt: Date.now() + 100000,
      };
      mockCache.get.mockResolvedValue(expiringToken);
      mockAuthManager.getAccessToken.mockResolvedValue('manually-refreshed-token');
      
      await tokenRefresher.refreshNow();
      
      expect(logger.info).toHaveBeenCalledWith('Manually triggering token refresh');
      expect(mockAuthManager.clearToken).toHaveBeenCalled();
      expect(mockAuthManager.getAccessToken).toHaveBeenCalled();
    });
  });

  describe('singleton functions', () => {
    it('should initialize singleton refresher', () => {
      const refresher = initializeTokenRefresher(mockAuthManager, {
        refreshBeforeExpiry: 600,
      });
      
      expect(refresher).toBeInstanceOf(TokenRefresher);
      expect(refresher.getStatus().isRunning).toBe(true);
      expect(refresher.getStatus().refreshBeforeExpiry).toBe(600);
    });

    it('should return existing refresher if already initialized', () => {
      const refresher1 = initializeTokenRefresher(mockAuthManager);
      const refresher2 = initializeTokenRefresher(mockAuthManager);
      
      expect(refresher1).toBe(refresher2);
      expect(logger.warn).toHaveBeenCalledWith('Token refresher already initialized');
    });

    it('should get current refresher instance', () => {
      expect(getTokenRefresher()).toBeNull();
      
      const refresher = initializeTokenRefresher(mockAuthManager);
      
      expect(getTokenRefresher()).toBe(refresher);
    });

    it('should stop and cleanup singleton', () => {
      const refresher = initializeTokenRefresher(mockAuthManager);
      
      stopTokenRefresher();
      
      expect(refresher.getStatus().isRunning).toBe(false);
      expect(getTokenRefresher()).toBeNull();
    });
  });
});