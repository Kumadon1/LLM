/**
 * Base API Client
 * Provides centralized API communication with consistent error handling
 */

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface ApiErrorType {
  message: string;
  status?: number;
  details?: any;
}

export class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  private constructor() {
    // Use environment variable or default to localhost
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Generic request method with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new ApiError(
          data?.detail || data?.message || `Request failed with status ${response.status}`,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network errors or other fetch failures
      if (error instanceof Error) {
        throw new ApiError(
          error.message || 'Network request failed',
          0
        );
      }
      
      throw new ApiError('An unexpected error occurred');
    }
  }

  /**
   * GET request
   */
  public async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  public async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  public async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  public async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * PATCH request
   */
  public async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Upload file(s)
   */
  public async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
    });
  }

  /**
   * Set custom headers for all requests
   */
  public setHeader(key: string, value: string): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      [key]: value,
    };
  }

  /**
   * Remove a custom header
   */
  public removeHeader(key: string): void {
    const headers = { ...this.defaultHeaders };
    delete headers[key];
    this.defaultHeaders = headers;
  }

  /**
   * Get the current base URL
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Update the base URL (useful for environment switching)
   */
  public setBaseUrl(url: string): void {
    this.baseUrl = url;
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public status?: number;
  public details?: any;

  constructor(message: string, status?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  public isNetworkError(): boolean {
    return this.status === 0;
  }

  public isServerError(): boolean {
    return this.status !== undefined && this.status >= 500;
  }

  public isClientError(): boolean {
    return this.status !== undefined && this.status >= 400 && this.status < 500;
  }

  public isNotFound(): boolean {
    return this.status === 404;
  }

  public isUnauthorized(): boolean {
    return this.status === 401;
  }

  public isForbidden(): boolean {
    return this.status === 403;
  }
}

// Export a singleton instance
export const apiClient = ApiClient.getInstance();
