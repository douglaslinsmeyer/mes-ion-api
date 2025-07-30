import axios, { AxiosInstance, AxiosError } from 'axios';
import { IONRequestOptions, IONApiResponse } from './types';
import { IONAuthManager } from './auth';
import { config } from '../config/index';
import logger from '../utils/logger';
import { IONAPIError } from '../utils/errors';

export class IONApiClient {
  private readonly authManager: IONAuthManager;
  private readonly apiEndpoint: string;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.authManager = new IONAuthManager();
    this.apiEndpoint = config.ion.apiEndpoint;
    
    // Create axios instance with default config
    this.axiosInstance = axios.create({
      baseURL: this.apiEndpoint,
      timeout: config.requestTimeoutMs,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug('ION API request', {
          method: config.method,
          url: config.url,
          params: config.params,
        });
        return config;
      },
      (error) => {
        logger.error('ION API request error', error);
        return Promise.reject(error);
      },
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug('ION API response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('ION API response error', {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
        });
        return Promise.reject(error);
      },
    );
  }

  async request<T = unknown>(
    path: string,
    options: IONRequestOptions = {},
  ): Promise<IONApiResponse<T>> {
    try {
      // Get access token
      const accessToken = await this.authManager.getAccessToken();

      // Build headers
      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
      };

      // Add optional headers
      if (config.ion.subscriptionKey) {
        headers['Ocp-Apim-Subscription-Key'] = config.ion.subscriptionKey;
      }
      if (config.ion.organization) {
        headers['X-Infor-Organization'] = config.ion.organization;
      }

      // Make request
      const response = await this.axiosInstance.request<T>({
        method: options.method || 'GET',
        url: path,
        headers,
        params: options.queryParams,
        data: options.body,
        timeout: options.timeout,
      });

      return {
        data: response.data,
        headers: response.headers as Record<string, string>,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle 401 errors by clearing token and retrying once
        if (error.response?.status === 401 && !options.headers?.['X-Retry-Auth']) {
          logger.info('Received 401, clearing token and retrying');
          await this.authManager.clearToken();
          
          return this.request<T>(path, {
            ...options,
            headers: {
              ...options.headers,
              'X-Retry-Auth': 'true',
            },
          });
        }

        throw new IONAPIError(
          `ION API request failed: ${error.message}`,
          error.response?.status || 500,
          {
            url: error.config?.url,
            method: error.config?.method,
            data: error.response?.data,
          },
        );
      }

      throw error;
    }
  }

  // Convenience methods
  async get<T = unknown>(
    path: string,
    queryParams?: Record<string, string | number | boolean>,
  ): Promise<IONApiResponse<T>> {
    return this.request<T>(path, { method: 'GET', queryParams });
  }

  async post<T = unknown>(
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean>,
  ): Promise<IONApiResponse<T>> {
    return this.request<T>(path, { method: 'POST', body, queryParams });
  }

  async put<T = unknown>(
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean>,
  ): Promise<IONApiResponse<T>> {
    return this.request<T>(path, { method: 'PUT', body, queryParams });
  }

  async patch<T = unknown>(
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean>,
  ): Promise<IONApiResponse<T>> {
    return this.request<T>(path, { method: 'PATCH', body, queryParams });
  }

  async delete<T = unknown>(
    path: string,
    queryParams?: Record<string, string | number | boolean>,
  ): Promise<IONApiResponse<T>> {
    return this.request<T>(path, { method: 'DELETE', queryParams });
  }
}

// Export singleton instance
export const ionClient = new IONApiClient();