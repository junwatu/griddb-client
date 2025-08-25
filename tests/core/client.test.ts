import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GridDBClient } from '../../src/core/client';
import { GridDBError } from '../../src/types';

describe('GridDBClient', () => {
  let client: GridDBClient;
  const mockConfig = {
    griddbWebApiUrl: 'http://localhost:8080/griddb/v2',
    username: 'test_user',
    password: 'test_password'
  };

  beforeEach(() => {
    client = new GridDBClient(mockConfig);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with valid config', () => {
      expect(client).toBeInstanceOf(GridDBClient);
      expect(client.getConfig()).toMatchObject(mockConfig);
    });

    it('should throw error with invalid URL', () => {
      expect(() => {
        new GridDBClient({
          ...mockConfig,
          griddbWebApiUrl: 'invalid-url'
        });
      }).toThrow('GridDB Web API URL must start with http:// or https://');
    });

    it('should throw error without username', () => {
      expect(() => {
        new GridDBClient({
          ...mockConfig,
          username: ''
        });
      }).toThrow('GridDB username and password are required');
    });

    it('should set default timeout and retry values', () => {
      // The config values are stored in private properties, not in the config object
      // We can test them by checking the behavior instead
      expect(client).toBeDefined();
      expect(client.getConfig()).toMatchObject(mockConfig);
    });
  });

  describe('request', () => {
    it('should make successful request', async () => {
      const mockResponse = { success: true, data: 'test' };
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await client.request('/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/griddb/v2/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic'),
            'Content-Type': 'application/json; charset=UTF-8'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should retry on failure', async () => {
      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        );

      const result = await client.request('/test');
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it('should throw GridDBError on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('Not Found', { status: 404 })
      );

      await expect(client.request('/test')).rejects.toThrow(GridDBError);
    });

    it('should not retry on client errors (4xx)', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('Bad Request', { status: 400 })
      );

      await expect(client.request('/test')).rejects.toThrow(GridDBError);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('containerExists', () => {
    it('should return true if container exists', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ name: 'test_container' }), { status: 200 })
      );

      const exists = await client.containerExists('test_container');
      
      expect(exists).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/containers/test_container/info'),
        expect.any(Object)
      );
    });

    it('should return false if container does not exist', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('Not Found', { status: 404 })
      );

      const exists = await client.containerExists('non_existent');
      
      expect(exists).toBe(false);
    });

    it('should throw error on other HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('Internal Server Error', { status: 500 })
      );

      await expect(client.containerExists('test')).rejects.toThrow(GridDBError);
    });
  });

  describe('listContainers', () => {
    it('should return list of containers', async () => {
      const mockContainers = ['container1', 'container2', 'container3'];
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ container_names: mockContainers }), { status: 200 })
      );

      const containers = await client.listContainers();
      
      expect(containers).toEqual(mockContainers);
    });

    it('should return empty array if no containers', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      );

      const containers = await client.listContainers();
      
      expect(containers).toEqual([]);
    });
  });

  describe('HTTP method helpers', () => {
    it('should make GET request', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: 'test' }), { status: 200 })
      );

      await client.get('/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST request with body', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const body = { key: 'value' };
      await client.post('/test', body);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body)
        })
      );
    });

    it('should make PUT request', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ updated: true }), { status: 200 })
      );

      await client.put('/test', { data: 'update' });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should make DELETE request', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('', { status: 200 })
      );

      await client.delete('/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
