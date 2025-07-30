import { parseIONAPIJson, loadIONCredentials } from './ionapi-parser';
import logger from './logger';

jest.mock('./logger');

describe('ION API Parser', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;

  const sampleIONAPIFile = {
    ti: 'XK3JRT8CJCAF9GWY_TRN',
    cn: 'PING REST API Dev',
    dt: '12',
    ci: 'XK3JRT8CJCAF9GWY_TRN~k2nMEGaSLbC3eCx1ZZ9Exo76nzMk915e4yuB_QK6eTA',
    cs: 'X2dsI-HUMTd5zrsFzvBc4A7HuVUjpWzIoBSvEoVW2yfvkAny3CNCVtraC_C7S8oPYge_llm85dqs7XYHKvicqw',
    iu: 'https://mingle-ionapi.inforcloudsuite.com',
    pu: 'https://mingle-sso.inforcloudsuite.com:443/XK3JRT8CJCAF9GWY_TRN/as/',
    oa: 'authorization.oauth2',
    ot: 'token.oauth2',
    or: 'revoke_token.oauth2',
    sc: ['Infor-ION', 'Infor-M3'],
    ev: 'U1478358101',
    v: '1.1',
    saak: 'XK3JRT8CJCAF9GWY_TRN#EtoLX7zcQeMCj-VVfXvuV2x4-eG5sjS_MMG2agSVHZLkaDSbr-i9A3ZZ5k0eDTuuTOqB9LnnDj8ZYZugB_rqHA',
    sask: '_hJRp9ktDgUUBdDIoHZsfo4OEga4E8PMgk4MKCIiawxI_1J3LnqeuXB41m1dzV69BoBQXjMlDqDZerWd5FLvdg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseIONAPIJson', () => {
    it('should parse valid ION API JSON', () => {
      const jsonContent = JSON.stringify(sampleIONAPIFile);
      const result = parseIONAPIJson(jsonContent);

      expect(result).toEqual({
        tenantId: 'XK3JRT8CJCAF9GWY_TRN',
        clientId: 'XK3JRT8CJCAF9GWY_TRN~k2nMEGaSLbC3eCx1ZZ9Exo76nzMk915e4yuB_QK6eTA',
        clientSecret: 'X2dsI-HUMTd5zrsFzvBc4A7HuVUjpWzIoBSvEoVW2yfvkAny3CNCVtraC_C7S8oPYge_llm85dqs7XYHKvicqw',
        username: 'XK3JRT8CJCAF9GWY_TRN#EtoLX7zcQeMCj-VVfXvuV2x4-eG5sjS_MMG2agSVHZLkaDSbr-i9A3ZZ5k0eDTuuTOqB9LnnDj8ZYZugB_rqHA',
        password: '_hJRp9ktDgUUBdDIoHZsfo4OEga4E8PMgk4MKCIiawxI_1J3LnqeuXB41m1dzV69BoBQXjMlDqDZerWd5FLvdg',
        tokenEndpoint: 'https://mingle-sso.inforcloudsuite.com:443/XK3JRT8CJCAF9GWY_TRN/as/token.oauth2',
        apiEndpoint: 'https://mingle-ionapi.inforcloudsuite.com',
        scopes: ['Infor-ION', 'Infor-M3'],
      });
    });

    it('should handle trailing slash in pu field', () => {
      const fileWithoutTrailingSlash = {
        ...sampleIONAPIFile,
        pu: 'https://mingle-sso.inforcloudsuite.com:443/XK3JRT8CJCAF9GWY_TRN/as',
      };
      const jsonContent = JSON.stringify(fileWithoutTrailingSlash);
      const result = parseIONAPIJson(jsonContent);

      expect(result.tokenEndpoint).toBe('https://mingle-sso.inforcloudsuite.com:443/XK3JRT8CJCAF9GWY_TRN/as/token.oauth2');
    });

    it('should throw error for missing required fields', () => {
      const invalidFile = { ...sampleIONAPIFile };
      delete invalidFile.saak;
      const jsonContent = JSON.stringify(invalidFile);

      expect(() => parseIONAPIJson(jsonContent)).toThrow('Missing required field: saak');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => parseIONAPIJson('invalid json')).toThrow('Failed to parse ION API JSON');
    });
  });

  describe('loadIONCredentials', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should parse ION_API_JSON when available', () => {
      process.env.ION_API_JSON = JSON.stringify(sampleIONAPIFile);

      const result = loadIONCredentials();

      expect(result.clientId).toBe(sampleIONAPIFile.ci);
      expect(result.username).toBe(sampleIONAPIFile.saak);
      expect(mockLogger.info).toHaveBeenCalledWith('Loading ION credentials from ION_API_JSON environment variable');
    });

    it('should throw error for invalid ION_API_JSON', () => {
      process.env.ION_API_JSON = 'invalid json';

      expect(() => loadIONCredentials()).toThrow('ION_API_JSON environment variable contains invalid JSON');
    });

    it('should return empty object when ION_API_JSON is not set', () => {
      delete process.env.ION_API_JSON;

      const result = loadIONCredentials();

      expect(result).toEqual({});
      expect(mockLogger.debug).toHaveBeenCalledWith('No ION API JSON found, using individual environment variables');
    });
  });
});