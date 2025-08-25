/**
 * GridDB Cloud Client
 * Enhanced client specifically for GridDB Cloud
 */

import { GridDBClient } from './client';
import { GridDBCloudConfig, GridDBError } from '../types';

export class GridDBCloudClient extends GridDBClient {
  private readonly cluster: string;
  private readonly database: string;
  private readonly cloudRegion?: string;

  constructor(config: GridDBCloudConfig) {
    // Ensure SSL is enabled for cloud connections
    const cloudConfig = {
      ...config,
      useSSL: config.useSSL !== false, // Default to true for cloud
      timeout: config.timeout || 60000, // Higher timeout for cloud
      retryAttempts: config.retryAttempts || 5, // More retries for cloud
      retryDelay: config.retryDelay || 2000 // Longer delay for cloud
    };

    super(cloudConfig);

    this.cluster = config.cluster;
    this.database = config.database;
    this.cloudRegion = config.cloudRegion;

    this.validateCloudConfig();
  }

  /**
   * Validate GridDB Cloud specific configuration
   */
  private validateCloudConfig(): void {
    if (!this.cluster) {
      throw new GridDBError('GridDB Cloud cluster name is required');
    }
    if (!this.database) {
      throw new GridDBError('GridDB Cloud database name is required');
    }
    
    // Validate cloud URL format
    const config = this.getConfig();
    if (!config.griddbWebApiUrl.includes('.griddb.cloud')) {
      console.warn('Warning: URL does not appear to be a GridDB Cloud endpoint');
    }
    
    // Ensure HTTPS for cloud
    if (!config.griddbWebApiUrl.startsWith('https://')) {
      throw new GridDBError('GridDB Cloud requires HTTPS connection');
    }
  }

  /**
   * Get cloud-specific headers
   */
  private getCloudHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-GridDB-Cluster': this.cluster,
      'X-GridDB-Database': this.database
    };

    if (this.cloudRegion) {
      headers['X-GridDB-Region'] = this.cloudRegion;
    }

    return headers;
  }

  /**
   * Override request method to include cloud headers
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
    // Merge cloud-specific headers
    const cloudHeaders = this.getCloudHeaders();
    const mergedOptions = {
      ...options,
      headers: {
        ...cloudHeaders,
        ...options.headers
      }
    };

    return super.request<T>(path, mergedOptions);
  }

  /**
   * Get cloud cluster information
   */
  public async getClusterInfo(): Promise<any> {
    return this.get('/cluster/info');
  }

  /**
   * Get cloud database information
   */
  public async getDatabaseInfo(): Promise<any> {
    return this.get(`/databases/${this.database}/info`);
  }

  /**
   * Get cloud usage metrics
   */
  public async getUsageMetrics(startDate?: Date, endDate?: Date): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) {
      params.append('start', startDate.toISOString());
    }
    if (endDate) {
      params.append('end', endDate.toISOString());
    }

    const query = params.toString();
    const path = query ? `/metrics/usage?${query}` : '/metrics/usage';
    
    return this.get(path);
  }

  /**
   * Get cloud performance metrics
   */
  public async getPerformanceMetrics(): Promise<any> {
    return this.get('/metrics/performance');
  }

  /**
   * Create cloud backup
   */
  public async createBackup(backupName: string): Promise<any> {
    return this.post('/backups', {
      name: backupName,
      cluster: this.cluster,
      database: this.database,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * List cloud backups
   */
  public async listBackups(): Promise<any[]> {
    const response = await this.get<{ backups: any[] }>('/backups');
    return response.backups || [];
  }

  /**
   * Restore from cloud backup
   */
  public async restoreBackup(backupId: string): Promise<any> {
    return this.post(`/backups/${backupId}/restore`, {
      cluster: this.cluster,
      database: this.database
    });
  }

  /**
   * Get cloud service status
   */
  public async getServiceStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    services: Record<string, string>;
    timestamp: string;
  }> {
    try {
      const response = await this.get('/health');
      return response as any;
    } catch (error) {
      return {
        status: 'down',
        services: {},
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get cloud configuration
   */
  public getCloudConfig(): Readonly<{
    cluster: string;
    database: string;
    region?: string;
  }> {
    return Object.freeze({
      cluster: this.cluster,
      database: this.database,
      region: this.cloudRegion
    });
  }
}
