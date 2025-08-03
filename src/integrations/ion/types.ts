export interface IONTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface IONApiError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

export interface IONRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  queryParams?: Record<string, string | number | boolean>;
  timeout?: number;
  baseUrl?: string; // Optional override for the base URL
}

export interface IONApiClientConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
  apiEndpoint: string;
  subscriptionKey?: string;
  organization?: string;
}

export interface IONBODMessage {
  ApplicationArea: {
    Sender: {
      LogicalID: string;
      ComponentID: string;
    };
    CreationDateTime: string;
    BODID: string;
  };
  DataArea: unknown;
}

export interface IONApiResponse<T = unknown> {
  data: T;
  headers: Record<string, string>;
  status: number;
  statusText: string;
}