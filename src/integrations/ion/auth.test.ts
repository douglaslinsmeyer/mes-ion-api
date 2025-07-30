import axios from 'axios';
import { IONAuthManager } from './auth';
import { cache } from '../../cache/index';
import { config } from '../../config/index';
import { IONAPIError } from '../../utils/errors';

jest.mock('axios');
jest.mock('../../cache/index');
jest.mock('../../config/index', () => ({
  config: {
    ion: {
      tokenEndpoint: 'https://test.ion.com/token',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      username: 'test-username',
      password: 'test-password',
    },
    requestTimeoutMs: 30000,
  },
}));

describe('IONAuthManager', () => {
  let authManager: IONAuthManager;
  const mockAxios = axios as jest.Mocked<typeof axios>;
  const mockCache = cache as jest.Mocked<typeof cache>;

  beforeEach(() => {
    jest.clearAllMocks();
    authManager = new IONAuthManager();
  });

  describe('getAccessToken', () => {
    it('should return cached token if valid', async () => {
      const cachedToken = {
        token: 'cached-access-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };
      
      mockCache.get.mockResolvedValue(cachedToken);

      const token = await authManager.getAccessToken();

      expect(token).toBe('cached-access-token');
      expect(mockCache.get).toHaveBeenCalledWith('ion:oauth:token');
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should request new token if cache is empty', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'api',
        },
      });

      const token = await authManager.getAccessToken();

      expect(token).toBe('new-access-token');
      expect(mockCache.get).toHaveBeenCalledWith('ion:oauth:token');
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://test.ion.com/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        })
      );
      
      // Verify the correct grant type and credentials are sent
      const postCall = mockAxios.post.mock.calls[0];
      const params = postCall[1] as URLSearchParams;
      expect(params.get('grant_type')).toBe('password');
      expect(params.get('client_id')).toBe('test-client-id');
      expect(params.get('client_secret')).toBe('test-client-secret');
      expect(params.get('username')).toBe('test-username');
      expect(params.get('password')).toBe('test-password');
    });

    it('should request new token if cached token is expired', async () => {
      const expiredToken = {
        token: 'expired-token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };
      
      mockCache.get.mockResolvedValue(expiredToken);
      mockAxios.post.mockResolvedValue({
        data: {
          access_token: 'refreshed-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      const token = await authManager.getAccessToken();

      expect(token).toBe('refreshed-access-token');
      expect(mockAxios.post).toHaveBeenCalled();
    });
  });

  describe('requestNewToken', () => {
    it('should cache token with correct expiration', async () => {
      mockCache.get.mockResolvedValue(null);
      const mockResponse = {
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'api',
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const token = await authManager.getAccessToken();

      expect(mockCache.set).toHaveBeenCalledWith(
        'ion:oauth:token',
        expect.objectContaining({
          token: 'test-token',
          expiresAt: expect.any(Number),
        }),
        { ttlSeconds: 3540 } // 3600 - 60 seconds safety margin
      );
      expect(token).toBe('test-token');
    });

    it('should handle OAuth error response', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxios.post.mockResolvedValue({
        data: {
          error: 'invalid_client',
          error_description: 'Client authentication failed',
          error_uri: 'https://docs.ion.com/errors/invalid_client',
        },
      });

      await expect(authManager.getAccessToken()).rejects.toThrow(IONAPIError);
      await expect(authManager.getAccessToken()).rejects.toThrow(
        'OAuth token request failed: invalid_client'
      );
    });

    it('should handle network errors', async () => {
      mockCache.get.mockResolvedValue(null);
      const networkError = new Error('Network error');
      (networkError as any).response = {
        status: 500,
        data: { message: 'Internal server error' },
      };
      mockAxios.post.mockRejectedValue(networkError);
      mockAxios.isAxiosError = jest.fn().mockReturnValue(true);

      await expect(authManager.getAccessToken()).rejects.toThrow(IONAPIError);
      await expect(authManager.getAccessToken()).rejects.toThrow(
        'Failed to obtain ION access token'
      );
    });

    it('should send correct OAuth parameters', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxios.post.mockResolvedValue({
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      await authManager.getAccessToken();

      const callArgs = mockAxios.post.mock.calls[0];
      const urlParams = callArgs[1] as URLSearchParams;
      
      expect(urlParams.get('grant_type')).toBe('client_credentials');
      expect(urlParams.get('client_id')).toBe('test-client-id');
      expect(urlParams.get('client_secret')).toBe('test-client-secret');
    });
  });

  describe('clearToken', () => {
    it('should delete token from cache', async () => {
      await authManager.clearToken();

      expect(mockCache.delete).toHaveBeenCalledWith('ion:oauth:token');
    });
  });
});