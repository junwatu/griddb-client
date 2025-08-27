import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GridDBClient } from '../src/core/client';
import { CRUDOperations } from '../src/operations/crud';
import { GridDBError } from '../src/types';
import * as transformers from '../src/utils/transformers';

describe('Error Handling', () => {
  describe('GridDBError', () => {
    it('should create error with all properties', () => {
      const error = new GridDBError('Test error', 'ERR_001', 500, { detail: 'test' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('ERR_001');
      expect(error.status).toBe(500);
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.name).toBe('GridDBError');
    });

    it('should create error with minimal properties', () => {
      const error = new GridDBError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBeUndefined();
      expect(error.status).toBeUndefined();
      expect(error.details).toBeUndefined();
    });
  });

  describe('GridDBClient Error Handling', () => {
    let client: GridDBClient;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle network timeout', async () => {
      const client = new GridDBClient({
        griddbWebApiUrl: 'http://localhost:8080',
        username: 'test',
        password: 'test',
        timeout: 50,
        retryAttempts: 1,
        retryDelay: 10
      });

      // Mock fetch to simulate an abort error
      global.fetch = vi.fn().mockRejectedValue(new Error('The operation was aborted'));

      // The client should handle the abort and retry, then fail
      await expect(client.request('/test')).rejects.toThrow('Request failed after 1 attempts');
    });

    it('should handle malformed JSON response', async () => {
      const client = new GridDBClient({
        griddbWebApiUrl: 'http://localhost:8080',
        username: 'test',
        password: 'test'
      });

      global.fetch = vi.fn().mockResolvedValue(
        new Response('Invalid JSON {]', { status: 200 })
      );

      const result = await client.request('/test');
      // Should return raw text when JSON parsing fails
      expect(result).toBe('Invalid JSON {]');
    });

    it('should handle empty response', async () => {
      const client = new GridDBClient({
        griddbWebApiUrl: 'http://localhost:8080',
        username: 'test',
        password: 'test'
      });

      global.fetch = vi.fn().mockResolvedValue(
        new Response('', { status: 200 })
      );

      const result = await client.request('/test');
      expect(result).toEqual({});
    });

    it('should handle server errors with retry', async () => {
      const client = new GridDBClient({
        griddbWebApiUrl: 'http://localhost:8080',
        username: 'test',
        password: 'test',
        retryAttempts: 2,
        retryDelay: 10
      });

      global.fetch = vi.fn()
        .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

      const result = await client.request('/test');
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });
  });

  describe('CRUD Operations Error Handling', () => {
    let crud: CRUDOperations;
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        post: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        request: vi.fn(),
        containerExists: vi.fn(),
        getContainerInfo: vi.fn()
      };
      crud = new CRUDOperations(mockClient as GridDBClient);
    });

    it('should handle SQL execution failure', async () => {
      mockClient.post.mockRejectedValue(new Error('SQL execution failed'));

      await expect(crud.executeSql('INVALID SQL')).rejects.toThrow('SQL execution failed');
    });

    it('should handle empty SQL response', async () => {
      mockClient.post.mockResolvedValue(null);

      const result = await crud.executeSql('SELECT * FROM test');
      expect(result).toEqual({ columns: [], results: [] });
    });

    it('should handle malformed SQL response', async () => {
      mockClient.post.mockResolvedValue({ invalid: 'response' });

      const result = await crud.executeSql('SELECT * FROM test');
      expect(result).toEqual({ columns: [], results: [] });
    });

    it('should handle select with no results', async () => {
      mockClient.post.mockResolvedValue([{
        columns: [{ name: 'id', type: 'INTEGER' }],
        results: null
      }]);

      const result = await crud.select({ containerName: 'test' });
      expect(result).toEqual([]);
    });

    it('should handle selectOne with no results', async () => {
      mockClient.post.mockResolvedValue([{
        columns: [],
        results: []
      }]);

      const result = await crud.selectOne({ containerName: 'test' });
      expect(result).toBeNull();
    });

    it('should handle count with null result', async () => {
      mockClient.post.mockResolvedValue([{
        results: null
      }]);

      const count = await crud.count('test');
      expect(count).toBe(0);
    });

    it('should handle container creation failure', async () => {
      mockClient.containerExists.mockResolvedValue(false);
      mockClient.post.mockRejectedValue(new GridDBError('Container creation failed', 'ERR_CREATE', 400));

      await expect(crud.createContainer({
        containerName: 'test',
        columns: [{ name: 'id', type: 'INTEGER' }]
      })).rejects.toThrow(GridDBError);
    });

    it('should handle batch insert with all failures', async () => {
      mockClient.request.mockRejectedValue(new Error('Insert failed'));

      const data = Array.from({ length: 10 }, (_, i) => ({ id: i }));
      const result = await crud.batchInsert('test', data, 5);

      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(10);
      expect(result.errors).toHaveLength(2); // Two batches
    });
  });

  describe('Transformer Error Handling', () => {
    it('should handle null values in transformRowToArray', () => {
      const result = transformers.transformRowToArray(null);
      expect(result).toEqual([]);
    });

    it('should handle undefined values in transformRowToArray', () => {
      const result = transformers.transformRowToArray(undefined);
      expect(result).toEqual([]);
    });

    it('should handle null values in transformArrayToRow', () => {
      const result = transformers.transformArrayToRow(null as any, []);
      expect(result).toEqual({});
    });

    it('should handle invalid Date in toGridDBValue', () => {
      const invalidDate = new Date('invalid');
      const result = transformers.toGridDBValue(invalidDate);
      expect(result).toBeNull();
    });

    it('should handle parseConnectionString with invalid URL', () => {
      expect(() => {
        transformers.parseConnectionString('not-a-url');
      }).toThrow();
    });

    it('should handle buildInsertStatement with empty columns', () => {
      const result = transformers.buildInsertStatement('test', []);
      expect(result).toBe('INSERT INTO "test" () VALUES ()');
    });

    it('should handle base64ToBlob with invalid base64', () => {
      expect(() => {
        transformers.base64ToBlob('invalid-base64!!!');
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large batch sizes', async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({ success: true }),
        getContainerInfo: vi.fn().mockResolvedValue({
          container_name: 'test',
          container_type: 'COLLECTION',
          rowkey: true,
          columns: [{ name: 'id', type: 'INTEGER' as const }]
        })
      };
      const crud = new CRUDOperations(mockClient as any);

      const data = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
      const result = await crud.batchInsert('test', data, 1000);

      expect(mockClient.request).toHaveBeenCalledTimes(10);
      expect(result.succeeded).toBe(10000);
    });

    it('should handle containers with special characters', async () => {
      const client = new GridDBClient({
        griddbWebApiUrl: 'http://localhost:8080',
        username: 'test',
        password: 'test'
      });

      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ exists: true }), { status: 200 })
      );

      await client.containerExists('test-container_2024.v1');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/containers/test-container_2024.v1/info'),
        expect.any(Object)
      );
    });

    it('should handle deeply nested data structures', () => {
      const nested = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      };
      
      const result = transformers.transformRowToArray(nested);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('level2');
    });

    it('should handle concurrent operations', async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue([{
          columns: [],
          results: [[1], [2], [3]]
        }])
      };
      const crud = new CRUDOperations(mockClient as any);

      const promises = Array.from({ length: 10 }, () => 
        crud.count('test')
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r === 1)).toBe(true);
    });
  });
});
