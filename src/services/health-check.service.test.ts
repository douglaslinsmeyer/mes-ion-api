import { HealthCheckService } from './health-check.service';
import { IONAuthManager } from '../integrations/ion/auth';
import { cache } from '../cache/index';
import logger from '../utils/logger';

jest.mock('../integrations/ion/auth');
jest.mock('../cache/index');
jest.mock('../utils/logger');

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  const mockCache = cache as jest.Mocked<typeof cache>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HealthCheckService();
  });

  describe('checkCache', () => {
    it('should return connected status when cache is working', async () => {
      mockCache.set.mockResolvedValue(undefined);
      mockCache.get.mockResolvedValue('12345');
      mockCache.delete.mockResolvedValue(true);
      mockCache.getDriver.mockReturnValue('memory');

      const result = await service.checkCache();

      expect(result.status).toBe('connected');
      expect(result.driver).toBe('memory');
      expect(result.responseTime).toBeDefined();
      expect(mockCache.set).toHaveBeenCalledWith(
        'health:check:test',
        expect.any(String),
        { ttlSeconds: 10 }
      );
    });

    it('should return error status when cache fails', async () => {
      mockCache.set.mockRejectedValue(new Error('Cache error'));
      mockCache.getDriver.mockReturnValue('redis');

      const result = await service.checkCache();

      expect(result.status).toBe('error');
      expect(result.message).toBe('Cache error');
      expect(result.driver).toBe('redis');
    });
  });

  describe('checkIONApi', () => {
    it('should return connected status when ION API is accessible', async () => {
      const mockAuthManager = IONAuthManager.prototype as jest.Mocked<IONAuthManager>;
      mockAuthManager.getAccessToken.mockResolvedValue('valid-token');

      const result = await service.checkIONApi();

      expect(result.status).toBe('connected');
      expect(result.responseTime).toBeDefined();
    });

    it('should return error status when ION is not configured', async () => {
      const mockAuthManager = IONAuthManager.prototype as jest.Mocked<IONAuthManager>;
      mockAuthManager.getAccessToken.mockRejectedValue(
        new Error('Missing required ION configuration')
      );

      const result = await service.checkIONApi();

      expect(result.status).toBe('error');
      expect(result.message).toBe('ION API not configured');
    });

    it('should return disconnected status when ION is unreachable', async () => {
      const mockAuthManager = IONAuthManager.prototype as jest.Mocked<IONAuthManager>;
      mockAuthManager.getAccessToken.mockRejectedValue(
        new Error('ECONNREFUSED')
      );

      const result = await service.checkIONApi();

      expect(result.status).toBe('disconnected');
      expect(result.message).toBe('Cannot connect to ION API');
    });
  });

  describe('checkAll', () => {
    it('should check all services in parallel', async () => {
      mockCache.set.mockResolvedValue(undefined);
      mockCache.get.mockResolvedValue('12345');
      mockCache.delete.mockResolvedValue(true);
      mockCache.getDriver.mockReturnValue('memory');

      const mockAuthManager = IONAuthManager.prototype as jest.Mocked<IONAuthManager>;
      mockAuthManager.getAccessToken.mockResolvedValue('valid-token');

      const result = await service.checkAll();

      expect(result.cache.status).toBe('connected');
      expect(result.ionApi.status).toBe('connected');
    });
  });
});