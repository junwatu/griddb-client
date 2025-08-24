/**
 * Core GridDB Client
 * Handles HTTP communication with GridDB Web API
 */

import {
  GridDBConfig,
  GridDBError,
  GridDBResponse,
  Logger,
  ClientOptions
} from '../types';

export class GridDBClient {
  private readonly baseUrl: string;
  private readonly authToken: string;
  private readonly config: GridDBConfig;
  private readonly logger?: Logger;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;

  constructor(options: ClientOptions | GridDBConfig) {
    // Support both new ClientOptions and legacy GridDBConfig
    const config = 'config' in options ? options.config : options;
    const logger = 'logger' in options ? options.logger : undefined;

    this.config = config;
    this.logger = logger;
    this.baseUrl = config.griddbWebApiUrl.replace(/\/$/, ''); // Remove trailing slash
    this.authToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 second default

    this.validateConfig();
  }

  /**
   * Validate GridDB configuration
   */
  private validateConfig(): void {
    if (!this.config.griddbWebApiUrl) {
      throw new GridDBError('GridDB Web API URL is required');
    }
    if (!this.config.username || !this.config.password) {
      throw new GridDBError('GridDB username and password are required');
    }
    if (!this.config.griddbWebApiUrl.startsWith('http')) {
      throw new GridDBError('GridDB Web API URL must start with http:// or https://');
    }
  }

  /**
   * Make HTTP request to GridDB Web API
   */
  public async request<T = any>(
    path: string,
    options: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
      skipAuth?: boolean;
    } = {}
  ): Promise<T> {
    const { method = 'POST', body, headers = {}, skipAuth = false } = options;
    
    const url = `${this.baseUrl}${path}`;
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json; charset=UTF-8',
      ...headers
    };

    if (!skipAuth) {
      requestHeaders['Authorization'] = `Basic ${this.authToken}`;
    }

    this.logger?.debug(`GridDB Request: ${method} ${url}`, { body });

    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        
        this.logger?.debug(`GridDB Response: ${response.status}`, { responseText });

        if (!response.ok) {
          throw new GridDBError(
            `HTTP error! status: ${response.status} - ${responseText || response.statusText}`,
            response.status,
            response.status,
            responseText
          );
        }

        // Parse response
        if (responseText) {
          try {
            return JSON.parse(responseText);
          } catch {
            // Return raw text if not JSON
            return responseText as any;
          }
        }
        
        return {} as T;
        
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof GridDBError) {
          // Don't retry on client errors (4xx)
          if (error.status && error.status >= 400 && error.status < 500) {
            throw error;
          }
        }
        
        this.logger?.warn(`Request attempt ${attempt} failed: ${lastError.message}`);
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    throw new GridDBError(
      `Request failed after ${this.retryAttempts} attempts: ${lastError?.message}`,
      undefined,
      undefined,
      lastError
    );
  }

  /**
   * GET request helper
   */
  public async get<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'GET', headers });
  }

  /**
   * POST request helper
   */
  public async post<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, headers });
  }

  /**
   * PUT request helper
   */
  public async put<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, headers });
  }

  /**
   * DELETE request helper
   */
  public async delete<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', headers });
  }

  /**
   * Check if container exists
   */
  public async containerExists(containerName: string): Promise<boolean> {
    try {
      await this.get(`/containers/${containerName}/info`);
      return true;
    } catch (error) {
      if (error instanceof GridDBError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get container information
   */
  public async getContainerInfo(containerName: string): Promise<any> {
    return this.get(`/containers/${containerName}/info`);
  }

  /**
   * List all containers
   */
  public async listContainers(): Promise<string[]> {
    const response = await this.get<{ container_names: string[] }>('/containers');
    return response.container_names || [];
  }

  /**
   * Helper function for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get configuration
   */
  public getConfig(): Readonly<GridDBConfig> {
    return { ...this.config };
  }
}
