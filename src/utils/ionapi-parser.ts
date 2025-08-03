import logger from './logger';

export interface IONAPIFile {
  ti: string;  // Tenant ID
  cn: string;  // Connection Name
  dt: string;  // Data Type
  ci: string;  // Client ID
  cs: string;  // Client Secret
  iu: string;  // ION URL
  pu: string;  // Provider URL (base auth URL)
  oa: string;  // OAuth Authorization endpoint
  ot: string;  // OAuth Token endpoint
  or: string;  // OAuth Revoke endpoint
  sc: string[]; // Scopes
  ev: string;  // Event Version
  v: string;   // Version
  saak: string; // Service Account Access Key (username)
  sask: string; // Service Account Secret Key (password)
}

export interface ParsedIONCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  tokenEndpoint: string;
  apiEndpoint: string;
  scopes: string[];
}

/**
 * Parse ION API JSON and extract credentials
 * @param jsonContent JSON content as string
 * @returns Parsed ION credentials
 */
export function parseIONAPIJson(jsonContent: string): ParsedIONCredentials {
  try {
    logger.info('Parsing ION API JSON');
    
    // Parse JSON
    const ionData: IONAPIFile = JSON.parse(jsonContent);
    
    // Validate required fields
    const requiredFields = ['ti', 'ci', 'cs', 'iu', 'pu', 'ot', 'saak', 'sask'];
    for (const field of requiredFields) {
      if (!ionData[field as keyof IONAPIFile]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Construct the token endpoint URL
    // Remove trailing slash from pu if present
    const baseAuthUrl = ionData.pu.endsWith('/') ? ionData.pu.slice(0, -1) : ionData.pu;
    const tokenEndpoint = `${baseAuthUrl}/${ionData.ot}`;
    
    // Extract tenant ID from various possible locations
    const tenantId = ionData.ti || extractTenantFromUrl(ionData.iu) || extractTenantFromUrl(ionData.pu);
    
    logger.info('Successfully parsed ION API JSON', { 
      connectionName: ionData.cn,
      tenantId,
      scopes: ionData.sc 
    });
    
    // Construct the API endpoint with tenant if not already included
    let apiEndpoint = ionData.iu;
    
    // Check if the URL already includes the tenant
    const urlObj = new URL(apiEndpoint);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // If the base URL doesn't include the tenant in the path, add it
    if (pathParts.length === 0 || pathParts[0].toLowerCase() !== tenantId.toLowerCase()) {
      // Ensure no trailing slash on base URL
      apiEndpoint = apiEndpoint.endsWith('/') ? apiEndpoint.slice(0, -1) : apiEndpoint;
      // Add tenant to the path
      apiEndpoint = `${apiEndpoint}/${tenantId}`;
    }
    
    return {
      tenantId,
      clientId: ionData.ci,
      clientSecret: ionData.cs,
      username: ionData.saak,
      password: ionData.sask,
      tokenEndpoint,
      apiEndpoint,
      scopes: ionData.sc || [],
    };
  } catch (error) {
    logger.error('Failed to parse ION API JSON', { error });
    throw new Error(`Failed to parse ION API JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract tenant ID from an ION URL
 * @param url URL to extract tenant from
 * @returns Tenant ID or empty string
 */
function extractTenantFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    // Usually the tenant is the first path segment
    return pathParts[0] || '';
  } catch {
    return '';
  }
}

/**
 * Load ION credentials from environment variable
 * @returns ION credentials configuration
 */
export function loadIONCredentials(): Partial<ParsedIONCredentials> {
  // Check for ION_API_JSON environment variable
  if (process.env.ION_API_JSON) {
    try {
      logger.info('Loading ION credentials from ION_API_JSON environment variable');
      return parseIONAPIJson(process.env.ION_API_JSON);
    } catch (error) {
      logger.error('Failed to parse ION_API_JSON', { error });
      throw new Error('ION_API_JSON environment variable contains invalid JSON');
    }
  }
  
  // No ION API JSON found, return empty object (will fall back to individual env vars)
  logger.debug('No ION API JSON found, using individual environment variables');
  return {};
}