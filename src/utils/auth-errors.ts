/**
 * Specific error types for ION authentication failures
 */

export enum IONAuthErrorCode {
  INVALID_CREDENTIALS = 'ION_AUTH_INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'ION_AUTH_TOKEN_EXPIRED',
  TOKEN_REFRESH_FAILED = 'ION_AUTH_TOKEN_REFRESH_FAILED',
  NETWORK_ERROR = 'ION_AUTH_NETWORK_ERROR',
  CONFIGURATION_ERROR = 'ION_AUTH_CONFIGURATION_ERROR',
  RATE_LIMITED = 'ION_AUTH_RATE_LIMITED',
  SERVICE_UNAVAILABLE = 'ION_AUTH_SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'ION_AUTH_UNKNOWN_ERROR',
}

export interface IONAuthErrorDetails {
  code: IONAuthErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  retryable: boolean;
  retryAfter?: number;
}

export class IONAuthenticationError extends Error {
  public readonly code: IONAuthErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;

  constructor(errorDetails: IONAuthErrorDetails) {
    super(errorDetails.message);
    this.name = 'IONAuthenticationError';
    this.code = errorDetails.code;
    this.statusCode = errorDetails.statusCode;
    this.details = errorDetails.details;
    this.retryable = errorDetails.retryable;
    this.retryAfter = errorDetails.retryAfter;

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IONAuthenticationError);
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      retryable: this.retryable,
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Factory functions for creating specific auth errors
 */
export const AuthErrors = {
  invalidCredentials: (details?: Record<string, any>): IONAuthenticationError =>
    new IONAuthenticationError({
      code: IONAuthErrorCode.INVALID_CREDENTIALS,
      message: 'Invalid ION API credentials',
      statusCode: 401,
      details,
      retryable: false,
    }),

  tokenExpired: (details?: Record<string, any>): IONAuthenticationError =>
    new IONAuthenticationError({
      code: IONAuthErrorCode.TOKEN_EXPIRED,
      message: 'ION access token has expired',
      statusCode: 401,
      details,
      retryable: true,
    }),

  tokenRefreshFailed: (reason: string, details?: Record<string, any>): IONAuthenticationError =>
    new IONAuthenticationError({
      code: IONAuthErrorCode.TOKEN_REFRESH_FAILED,
      message: `Failed to refresh ION token: ${reason}`,
      statusCode: 500,
      details,
      retryable: true,
    }),

  networkError: (message: string, details?: Record<string, any>): IONAuthenticationError =>
    new IONAuthenticationError({
      code: IONAuthErrorCode.NETWORK_ERROR,
      message: `Network error during ION authentication: ${message}`,
      statusCode: 503,
      details,
      retryable: true,
    }),

  configurationError: (message: string, details?: Record<string, any>): IONAuthenticationError =>
    new IONAuthenticationError({
      code: IONAuthErrorCode.CONFIGURATION_ERROR,
      message: `ION configuration error: ${message}`,
      statusCode: 500,
      details,
      retryable: false,
    }),

  rateLimited: (retryAfter?: number, details?: Record<string, any>): IONAuthenticationError =>
    new IONAuthenticationError({
      code: IONAuthErrorCode.RATE_LIMITED,
      message: 'ION API rate limit exceeded',
      statusCode: 429,
      details,
      retryable: true,
      retryAfter,
    }),

  serviceUnavailable: (details?: Record<string, any>): IONAuthenticationError =>
    new IONAuthenticationError({
      code: IONAuthErrorCode.SERVICE_UNAVAILABLE,
      message: 'ION authentication service is unavailable',
      statusCode: 503,
      details,
      retryable: true,
    }),

  unknownError: (message: string, statusCode = 500, details?: Record<string, any>): IONAuthenticationError =>
    new IONAuthenticationError({
      code: IONAuthErrorCode.UNKNOWN_ERROR,
      message: `Unknown ION authentication error: ${message}`,
      statusCode,
      details,
      retryable: true,
    }),
};

/**
 * Helper function to determine error type from OAuth response
 */
export function parseOAuthError(error: any): IONAuthenticationError {
  if (!error || typeof error !== 'object') {
    return AuthErrors.unknownError('Invalid error object');
  }

  // Handle OAuth-specific error responses
  if (error.error === 'invalid_client' || error.error === 'invalid_grant') {
    return AuthErrors.invalidCredentials({
      oauthError: error.error,
      description: error.error_description,
      uri: error.error_uri,
    });
  }

  // Handle HTTP status codes
  const status = error.response?.status || error.status;
  
  switch (status) {
    case 401:
      return AuthErrors.invalidCredentials({ originalError: error });
    case 429:
      const retryAfter = error.response?.headers?.['retry-after'];
      return AuthErrors.rateLimited(
        retryAfter ? parseInt(retryAfter, 10) : undefined,
        { originalError: error }
      );
    case 503:
      return AuthErrors.serviceUnavailable({ originalError: error });
    default:
      if (status >= 500) {
        return AuthErrors.serviceUnavailable({ originalError: error });
      }
      return AuthErrors.unknownError(
        error.message || 'Unknown error',
        status,
        { originalError: error }
      );
  }
}

/**
 * Type guard to check if an error is an ION authentication error
 */
export function isIONAuthError(error: any): error is IONAuthenticationError {
  return error instanceof IONAuthenticationError;
}