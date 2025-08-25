import { describe, it, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { GridDBCloudClient } from '../../src/core/cloud-client';
import { GridDBError } from '../../src/types';

// Mock fetch globally before any module imports
const originalFetch = global.fetch;
global.fetch = vi.fn();

describe('GridDBCloudClient', () => {
  const validConfig = {
    griddbWebApiUrl: 'https://api.griddb.cloud',
    username: 'testuser',
    password: 'testpass',
    cluster: 'test-cluster',
    database: 'test-db',
    cloudRegion: 'us-west-2'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create cloud client with valid config', () => {
      const client = new GridDBCloudClient(validConfig);
      expect(client).toBeInstanceOf(GridDBCloudClient);
    });

    it('should default useSSL to true for cloud', () => {
      const config = { ...validConfig, useSSL: undefined };
      const client = new GridDBCloudClient(config);
      const clientConfig = client.getConfig();
      expect(clientConfig.useSSL).toBe(true);
    });

    it('should set higher default timeout for cloud', () => {
      const config = { ...validConfig, timeout: undefined };
      const client = new GridDBCloudClient(config);
      const clientConfig = client.getConfig();
      expect(clientConfig.timeout).toBe(60000);
    });

    it('should set more retry attempts for cloud', () => {
      const config = { ...validConfig, retryAttempts: undefined };
      const client = new GridDBCloudClient(config);
      const clientConfig = client.getConfig();
      expect(clientConfig.retryAttempts).toBe(5);
    });

    it('should set longer retry delay for cloud', () => {
      const config = { ...validConfig, retryDelay: undefined };
      const client = new GridDBCloudClient(config);
      const clientConfig = client.getConfig();
      expect(clientConfig.retryDelay).toBe(2000);
    });

    it('should throw error if cluster is missing', () => {
      const config = { ...validConfig, cluster: '' };
      expect(() => new GridDBCloudClient(config)).toThrow(GridDBError);
      expect(() => new GridDBCloudClient(config)).toThrow('GridDB Cloud cluster name is required');
    });

    it('should throw error if database is missing', () => {
      const config = { ...validConfig, database: '' };
      expect(() => new GridDBCloudClient(config)).toThrow(GridDBError);
      expect(() => new GridDBCloudClient(config)).toThrow('GridDB Cloud database name is required');
    });

    it('should throw error if URL is not HTTPS', () => {
      const config = { ...validConfig, griddbWebApiUrl: 'http://api.griddb.cloud' };
      expect(() => new GridDBCloudClient(config)).toThrow(GridDBError);
      expect(() => new GridDBCloudClient(config)).toThrow('GridDB Cloud requires HTTPS connection');
    });

    it('should warn if URL does not contain .griddb.cloud', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const config = { ...validConfig, griddbWebApiUrl: 'https://api.example.com' };
      new GridDBCloudClient(config);
      expect(consoleSpy).toHaveBeenCalledWith('Warning: URL does not appear to be a GridDB Cloud endpoint');
    });
  });

  describe('request', () => {
    it('should include cloud headers in requests', async () => {
      const client = new GridDBCloudClient(validConfig);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true }),
        json: async () => ({ success: true })
      });

      await client.request('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-GridDB-Cluster': 'test-cluster',
            'X-GridDB-Database': 'test-db',
            'X-GridDB-Region': 'us-west-2'
          })
        })
      );
    });

    it('should not include region header if cloudRegion is not set', async () => {
      const configWithoutRegion = { ...validConfig, cloudRegion: undefined };
      const client = new GridDBCloudClient(configWithoutRegion);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true }),
        json: async () => ({ success: true })
      });

      await client.request('/test');

      const callHeaders = (global.fetch as any).mock.calls[0][1].headers;
      expect(callHeaders['X-GridDB-Cluster']).toBe('test-cluster');
      expect(callHeaders['X-GridDB-Database']).toBe('test-db');
      expect(callHeaders['X-GridDB-Region']).toBeUndefined();
    });

    it('should merge custom headers with cloud headers', async () => {
      const client = new GridDBCloudClient(validConfig);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true }),
        json: async () => ({ success: true })
      });

      await client.request('/test', {
        headers: { 'Custom-Header': 'custom-value' }
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-GridDB-Cluster': 'test-cluster',
            'X-GridDB-Database': 'test-db',
            'X-GridDB-Region': 'us-west-2',
            'Custom-Header': 'custom-value'
          })
        })
      );
    });
  });

  describe('getClusterInfo', () => {
    it('should fetch cluster information', async () => {
      const client = new GridDBCloudClient(validConfig);
      const mockClusterInfo = { 
        name: 'test-cluster',
        nodes: 3,
        status: 'active' 
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockClusterInfo),
        json: async () => mockClusterInfo
      });

      const result = await client.getClusterInfo();
      
      expect(result).toEqual(mockClusterInfo);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cluster/info'),
        expect.any(Object)
      );
    });
  });

  describe('getDatabaseInfo', () => {
    it('should fetch database information', async () => {
      const client = new GridDBCloudClient(validConfig);
      const mockDbInfo = { 
        name: 'test-db',
        size: '100GB',
        collections: 50 
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockDbInfo),
        json: async () => mockDbInfo
      });

      const result = await client.getDatabaseInfo();
      
      expect(result).toEqual(mockDbInfo);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/databases/test-db/info'),
        expect.any(Object)
      );
    });
  });

  describe('getUsageMetrics', () => {
    it('should fetch usage metrics without date range', async () => {
      const client = new GridDBCloudClient(validConfig);
      const mockMetrics = { 
        cpu: 45,
        memory: 60,
        storage: 30 
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockMetrics),
        json: async () => mockMetrics
      });

      const result = await client.getUsageMetrics();
      
      expect(result).toEqual(mockMetrics);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/metrics/usage'),
        expect.any(Object)
      );
    });

    it('should fetch usage metrics with date range', async () => {
      const client = new GridDBCloudClient(validConfig);
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockMetrics = { 
        cpu: 45,
        memory: 60,
        storage: 30 
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockMetrics),
        json: async () => mockMetrics
      });

      const result = await client.getUsageMetrics(startDate, endDate);
      
      expect(result).toEqual(mockMetrics);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/metrics/usage?start=`),
        expect.any(Object)
      );
      // Verify URL contains encoded parameters
      const url = (global.fetch as any).mock.calls[0][0];
      expect(url).toContain('start=2024-01-01');
      expect(url).toContain('end=2024-01-31');
    });

    it('should fetch usage metrics with only start date', async () => {
      const client = new GridDBCloudClient(validConfig);
      const startDate = new Date('2024-01-01');
      const mockMetrics = { 
        cpu: 45,
        memory: 60,
        storage: 30 
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockMetrics),
        json: async () => mockMetrics
      });

      const result = await client.getUsageMetrics(startDate);
      
      expect(result).toEqual(mockMetrics);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/metrics/usage?start=`),
        expect.any(Object)
      );
      // Verify URL contains encoded parameter
      const url = (global.fetch as any).mock.calls[0][0];
      expect(url).toContain('start=2024-01-01');
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should fetch performance metrics', async () => {
      const client = new GridDBCloudClient(validConfig);
      const mockMetrics = { 
        queryLatency: 10,
        throughput: 1000,
        activeConnections: 25 
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockMetrics),
        json: async () => mockMetrics
      });

      const result = await client.getPerformanceMetrics();
      
      expect(result).toEqual(mockMetrics);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/metrics/performance'),
        expect.any(Object)
      );
    });
  });

  describe('createBackup', () => {
    it('should create a backup', async () => {
      const client = new GridDBCloudClient(validConfig);
      const backupName = 'test-backup';
      const mockBackup = { 
        id: 'backup-123',
        name: backupName,
        status: 'created' 
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify(mockBackup),
        json: async () => mockBackup
      });

      const result = await client.createBackup(backupName);
      
      expect(result).toEqual(mockBackup);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/backups'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(backupName)
        })
      );

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody).toMatchObject({
        name: backupName,
        cluster: 'test-cluster',
        database: 'test-db'
      });
      expect(callBody.timestamp).toBeDefined();
    });
  });

  describe('listBackups', () => {
    it('should list backups', async () => {
      const client = new GridDBCloudClient(validConfig);
      const mockBackups = [
        { id: 'backup-1', name: 'backup-1' },
        { id: 'backup-2', name: 'backup-2' }
      ];
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ backups: mockBackups }),
        json: async () => ({ backups: mockBackups })
      });

      const result = await client.listBackups();
      
      expect(result).toEqual(mockBackups);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/backups'),
        expect.any(Object)
      );
    });

    it('should return empty array if no backups', async () => {
      const client = new GridDBCloudClient(validConfig);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({}),
        json: async () => ({})
      });

      const result = await client.listBackups();
      
      expect(result).toEqual([]);
    });
  });

  describe('restoreBackup', () => {
    it('should restore a backup', async () => {
      const client = new GridDBCloudClient(validConfig);
      const backupId = 'backup-123';
      const mockRestore = { 
        status: 'restoring',
        jobId: 'job-456' 
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 202,
        text: async () => JSON.stringify(mockRestore),
        json: async () => mockRestore
      });

      const result = await client.restoreBackup(backupId);
      
      expect(result).toEqual(mockRestore);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/backups/${backupId}/restore`),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test-cluster')
        })
      );

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody).toEqual({
        cluster: 'test-cluster',
        database: 'test-db'
      });
    });
  });

  describe('getServiceStatus', () => {
    it('should fetch service status when healthy', async () => {
      const client = new GridDBCloudClient(validConfig);
      const mockStatus = { 
        status: 'healthy',
        services: {
          api: 'operational',
          database: 'operational'
        },
        timestamp: '2024-01-01T00:00:00Z'
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockStatus),
        json: async () => mockStatus
      });

      const result = await client.getServiceStatus();
      
      expect(result).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.any(Object)
      );
    });

    it('should return down status on error', async () => {
      const client = new GridDBCloudClient(validConfig);
      
      // Mock fetch to reject for all retry attempts (5 retries for cloud client)
      for (let i = 0; i < 5; i++) {
        (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      }

      const result = await client.getServiceStatus();
      
      expect(result.status).toBe('down');
      expect(result.services).toEqual({});
      expect(result.timestamp).toBeDefined();
    }, 40000); // Increase timeout for retries with exponential backoff

    it('should return down status on HTTP error', async () => {
      const client = new GridDBCloudClient(validConfig);
      
      // Mock multiple fetch calls since the client retries on 5xx errors
      const mockErrorResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Service Unavailable'
      };
      
      // Mock for all retry attempts (5 retries for cloud client with exponential backoff)
      for (let i = 0; i < 5; i++) {
        (global.fetch as any).mockResolvedValueOnce(mockErrorResponse);
      }

      const result = await client.getServiceStatus();
      
      expect(result.status).toBe('down');
      expect(result.services).toEqual({});
      expect(result.timestamp).toBeDefined();
    }, 30000); // Increase timeout for retries with exponential backoff
  });

  describe('getCloudConfig', () => {
    it('should return cloud configuration', () => {
      const client = new GridDBCloudClient(validConfig);
      
      const config = client.getCloudConfig();
      
      expect(config).toEqual({
        cluster: 'test-cluster',
        database: 'test-db',
        region: 'us-west-2'
      });
    });

    it('should return config without region if not set', () => {
      const configWithoutRegion = { ...validConfig, cloudRegion: undefined };
      const client = new GridDBCloudClient(configWithoutRegion);
      
      const config = client.getCloudConfig();
      
      expect(config).toEqual({
        cluster: 'test-cluster',
        database: 'test-db',
        region: undefined
      });
    });

    it('should return readonly config', () => {
      const client = new GridDBCloudClient(validConfig);
      
      const config = client.getCloudConfig();
      
      // TypeScript should enforce readonly, but we can test that the returned object is frozen
      expect(() => {
        (config as any).cluster = 'modified';
      }).toThrow();
    });
  });
});
