import axios, { AxiosError } from 'axios';
import { IONApiClient } from './client';
import { IONAuthManager } from './auth';
import { config } from '../../config/index';
import { IONAPIError } from '../../utils/errors';

jest.mock('axios');
jest.mock('./auth');
jest.mock('../../config/index', () => ({
  config: {
    ion: {
      apiEndpoint: 'https://test.ion.com/api',
      subscriptionKey: 'test-subscription-key',
      organization: 'test-org',
    },
    requestTimeoutMs: 30000,
  },
}));

describe('IONApiClient', () => {
  let client: IONApiClient;
  let mockAuthManager: jest.Mocked<IONAuthManager>;
  const mockAxios = axios as jest.Mocked<typeof axios>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };
    mockAxios.create.mockReturnValue(mockAxiosInstance as any);
    mockAxios.isAxiosError = jest.fn().mockReturnValue(true);
    
    // Create client which will use mocked dependencies
    client = new IONApiClient();
    
    // Get reference to mocked auth manager
    mockAuthManager = (client as any).authManager;
    mockAuthManager.getAccessToken = jest.fn().mockResolvedValue('test-access-token');
    mockAuthManager.clearToken = jest.fn().mockResolvedValue(undefined);
    
    // Update the mock axios instance reference
    (client as any).axiosInstance = mockAxiosInstance;
  });

  describe('request', () => {
    it('should add authorization header with token', async () => {
      const mockResponse = {
        data: { result: 'success' },
        headers: { 'content-type': 'application/json' },
        status: 200,
        statusText: 'OK',
      };
      ((client as any).axiosInstance.request as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.request('/test-endpoint');

      expect(mockAuthManager.getAccessToken).toHaveBeenCalled();
      expect((client as any).axiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/test-endpoint',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-access-token',
          'Ocp-Apim-Subscription-Key': 'test-subscription-key',
          'X-Infor-Organization': 'test-org',
        }),
        params: undefined,
        data: undefined,
        timeout: undefined,
      });
      expect(result).toEqual({
        data: { result: 'success' },
        headers: { 'content-type': 'application/json' },
        status: 200,
        statusText: 'OK',
      });
    });

    it('should retry once on 401 error', async () => {
      const error401 = new Error('Unauthorized') as AxiosError;
      error401.response = {
        status: 401,
        data: { error: 'Token expired' },
      } as any;
      
      // First call fails with 401
      ((client as any).axiosInstance.request as jest.Mock)
        .mockRejectedValueOnce(error401)
        .mockResolvedValueOnce({
          data: { result: 'success after retry' },
          headers: {},
          status: 200,
          statusText: 'OK',
        });

      const result = await client.request('/test-endpoint');

      expect(mockAuthManager.clearToken).toHaveBeenCalled();
      expect(mockAuthManager.getAccessToken).toHaveBeenCalledTimes(2);
      expect((client as any).axiosInstance.request).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual({ result: 'success after retry' });
    });

    it('should not retry 401 error if already retried', async () => {
      const error401 = new Error('Unauthorized') as AxiosError;
      error401.response = {
        status: 401,
        data: { error: 'Token expired' },
      } as any;
      
      ((client as any).axiosInstance.request as jest.Mock).mockRejectedValue(error401);

      await expect(
        client.request('/test-endpoint', {
          headers: { 'X-Retry-Auth': 'true' },
        })
      ).rejects.toThrow(IONAPIError);
      
      expect(mockAuthManager.clearToken).not.toHaveBeenCalled();
      expect((client as any).axiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should handle non-401 errors correctly', async () => {
      const error500 = new Error('Server Error') as AxiosError;
      error500.response = {
        status: 500,
        data: { error: 'Internal server error' },
      } as any;
      error500.config = { url: '/test-endpoint', method: 'GET' } as any;
      
      ((client as any).axiosInstance.request as jest.Mock).mockRejectedValue(error500);

      await expect(client.request('/test-endpoint')).rejects.toThrow(IONAPIError);
      await expect(client.request('/test-endpoint')).rejects.toThrow(
        'ION API request failed: Server Error'
      );
      
      expect(mockAuthManager.clearToken).not.toHaveBeenCalled();
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      ((client as any).axiosInstance.request as jest.Mock).mockResolvedValue({
        data: { result: 'success' },
        headers: {},
        status: 200,
        statusText: 'OK',
      });
    });

    it('should make GET request', async () => {
      await client.get('/orders', { status: 'active' });

      expect((client as any).axiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/orders',
          params: { status: 'active' },
        })
      );
    });

    it('should make POST request', async () => {
      const body = { order: { id: '123' } };
      await client.post('/orders', body, { facility: 'FAC001' });

      expect((client as any).axiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/orders',
          data: body,
          params: { facility: 'FAC001' },
        })
      );
    });

    it('should make PUT request', async () => {
      const body = { status: 'completed' };
      await client.put('/orders/123', body);

      expect((client as any).axiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/orders/123',
          data: body,
        })
      );
    });

    it('should make PATCH request', async () => {
      const body = [{ op: 'replace', path: '/status', value: 'active' }];
      await client.patch('/orders/123', body);

      expect((client as any).axiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: '/orders/123',
          data: body,
        })
      );
    });

    it('should make DELETE request', async () => {
      await client.delete('/orders/123', { soft: true });

      expect((client as any).axiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: '/orders/123',
          params: { soft: true },
        })
      );
    });
  });
});