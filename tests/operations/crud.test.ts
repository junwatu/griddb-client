import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CRUDOperations } from '../../src/operations/crud';
import { GridDBClient } from '../../src/core/client';

describe('CRUDOperations', () => {
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

  describe('createContainer', () => {
    it('should create container with default options', async () => {
      mockClient.containerExists.mockResolvedValue(false);
      mockClient.post.mockResolvedValue({ success: true });

      await crud.createContainer({
        containerName: 'test_container',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'name', type: 'STRING' }
        ]
      });

      expect(mockClient.containerExists).toHaveBeenCalledWith('test_container');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/containers',
        expect.objectContaining({
          container_name: 'test_container',
          container_type: 'COLLECTION',
          rowkey: true,
          columns: expect.arrayContaining([
            { name: 'id', type: 'INTEGER' },
            { name: 'name', type: 'STRING' }
          ])
        })
      );
    });

    it('should skip creation if container exists and ifNotExists is true', async () => {
      mockClient.containerExists.mockResolvedValue(true);

      await crud.createContainer({
        containerName: 'existing_container',
        columns: [{ name: 'id', type: 'INTEGER' }],
        ifNotExists: true
      });

      expect(mockClient.containerExists).toHaveBeenCalled();
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should create TIME_SERIES container', async () => {
      mockClient.containerExists.mockResolvedValue(false);
      mockClient.post.mockResolvedValue({ success: true });

      await crud.createContainer({
        containerName: 'timeseries',
        columns: [
          { name: 'timestamp', type: 'TIMESTAMP' },
          { name: 'value', type: 'DOUBLE' }
        ],
        containerType: 'TIME_SERIES'
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/containers',
        expect.objectContaining({
          container_type: 'TIME_SERIES'
        })
      );
    });
  });

  describe('insert', () => {
    const schema = [
      { name: 'id', type: 'INTEGER' as const },
      { name: 'name', type: 'STRING' as const }
    ];

    it('should insert single row', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      await crud.insert({
        containerName: 'users',
        data: { name: 'John', id: 1 },
        schema
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        '/containers/users/rows',
        expect.objectContaining({
          method: 'PUT',
          body: [[1, 'John']]
        })
      );
    });

    it('should insert multiple rows', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      await crud.insert({
        containerName: 'users',
        data: [
          { name: 'John', id: 1 },
          { name: 'Jane', id: 2 }
        ],
        schema
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        '/containers/users/rows',
        expect.objectContaining({
          method: 'PUT',
          body: [[1, 'John'], [2, 'Jane']]
        })
      );
    });

    it('should use PUT method when updateIfExists is true', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      await crud.insert({
        containerName: 'users',
        data: { name: 'John', id: 1 },
        updateIfExists: true,
        schema
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        '/containers/users/rows',
        expect.objectContaining({
          method: 'PUT'
        })
      );
    });

    it('should handle mixed object and array data', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      await crud.insert({
        containerName: 'users',
        data: [
          { name: 'John', id: 1 },
          [2, 'Jane']
        ],
        schema
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        '/containers/users/rows',
        expect.objectContaining({
          body: [[1, 'John'], [2, 'Jane']]
        })
      );
    });

    it('should cache container schema', async () => {
      const schemaInfo = {
        container_name: 'users',
        container_type: 'COLLECTION',
        rowkey: true,
        columns: schema
      };
      mockClient.request.mockResolvedValue({ success: true });
      mockClient.getContainerInfo.mockResolvedValue(schemaInfo);

      await crud.insert({ containerName: 'users', data: { id: 1, name: 'John' } });
      await crud.insert({ containerName: 'users', data: { id: 2, name: 'Jane' } });

      expect(mockClient.getContainerInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe('select', () => {
    it('should select all rows', async () => {
      mockClient.post.mockResolvedValue([{
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'name', type: 'STRING' }
        ],
        results: [[1, 'John'], [2, 'Jane']]
      }]);

      const results = await crud.select({
        containerName: 'users'
      });

      expect(results).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]);
    });

    it('should select with conditions', async () => {
      mockClient.post.mockResolvedValue([{
        columns: [{ name: 'id', type: 'INTEGER' }, { name: 'name', type: 'STRING' }],
        results: [[1, 'John']]
      }]);

      const results = await crud.select({
        containerName: 'users',
        where: 'id = ?',
        bindings: [1]
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/sql/dml/query',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'sql-select',
            stmt: expect.stringContaining('WHERE id = ?'),
            bindings: [1]
          })
        ])
      );
      expect(results).toHaveLength(1);
    });

    it('should apply limit and offset', async () => {
      mockClient.post.mockResolvedValue([{
        columns: [],
        results: []
      }]);

      await crud.select({
        containerName: 'users',
        limit: 10,
        offset: 20
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/sql/dml/query',
        expect.arrayContaining([
          expect.objectContaining({
            stmt: expect.stringContaining('LIMIT 10 OFFSET 20')
          })
        ])
      );
    });

    it('should order results', async () => {
      mockClient.post.mockResolvedValue([{
        columns: [],
        results: []
      }]);

      await crud.select({
        containerName: 'users',
        orderBy: 'name',
        order: 'DESC'
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/sql/dml/query',
        expect.arrayContaining([
          expect.objectContaining({
            stmt: expect.stringContaining('ORDER BY name DESC')
          })
        ])
      );
    });
  });

  describe('update', () => {
    it('should update by rowkey when no where clause', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      await crud.update({
        containerName: 'users',
        data: { id: 1, name: 'John Updated' }
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        '/containers/users/rows',
        expect.objectContaining({
          method: 'PUT',
          body: [[1, 'John Updated']]
        })
      );
    });

    it('should update with where clause using DML endpoint', async () => {
      mockClient.post.mockResolvedValue([{ updatedRows: 1 }]);

      await crud.update({
        containerName: 'users',
        data: { status: 'active' },
        where: 'id = ?',
        bindings: [1]
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/sql/update',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'sql-update',
            stmt: expect.stringContaining('UPDATE users SET status = ? WHERE id = ?'),
            bindings: ['active', 1]
          })
        ])
      );
    });
  });

  describe('delete', () => {
    it('should delete with where clause using DML endpoint', async () => {
      mockClient.post.mockResolvedValue([{ updatedRows: 1 }]);

      await crud.delete({
        containerName: 'users',
        where: 'id = ?',
        bindings: [1]
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/sql/update',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'sql-update',
            stmt: 'DELETE FROM users WHERE id = ?',
            bindings: [1]
          })
        ])
      );
    });

    it('should delete without bindings', async () => {
      mockClient.post.mockResolvedValue([{ updatedRows: 5 }]);

      await crud.delete({
        containerName: 'users',
        where: 'status = \'inactive\''
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/sql/update',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'sql-update',
            stmt: 'DELETE FROM users WHERE status = \'inactive\''
          })
        ])
      );

      // Verify bindings is NOT included when not provided
      const callArgs = mockClient.post.mock.calls[0][1][0];
      expect(callArgs).not.toHaveProperty('bindings');
    });
  });

  describe('batchInsert', () => {
    it('should insert in batches', async () => {
      mockClient.request.mockResolvedValue({ success: true });

      const data = Array.from({ length: 250 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`
      }));

      const result = await crud.batchInsert('users', data, 100);

      expect(mockClient.request).toHaveBeenCalledTimes(3); // 100, 100, 50
      expect(result.succeeded).toBe(250);
      expect(result.failed).toBe(0);
    });

    it('should handle batch failures', async () => {
      mockClient.request
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Batch failed'))
        .mockResolvedValueOnce({ success: true });

      const data = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`
      }));

      const result = await crud.batchInsert('users', data, 10);

      expect(result.succeeded).toBe(20);
      expect(result.failed).toBe(10);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('count', () => {
    it('should count all rows', async () => {
      mockClient.post.mockResolvedValue([{
        results: [[100]]
      }]);

      const count = await crud.count('users');

      expect(mockClient.post).toHaveBeenCalledWith(
        '/sql/dml/query',
        expect.arrayContaining([
          expect.objectContaining({
            stmt: 'SELECT COUNT(*) FROM users'
          })
        ])
      );
      expect(count).toBe(100);
    });

    it('should count with conditions', async () => {
      mockClient.post.mockResolvedValue([{
        results: [[25]]
      }]);

      const count = await crud.count('users', 'status = ?', ['active']);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/sql/dml/query',
        expect.arrayContaining([
          expect.objectContaining({
            stmt: 'SELECT COUNT(*) FROM users WHERE status = ?',
            bindings: ['active']
          })
        ])
      );
      expect(count).toBe(25);
    });
  });

  describe('exists', () => {
    it('should return true if rows exist', async () => {
      mockClient.post.mockResolvedValue([{
        results: [[1]]
      }]);

      const exists = await crud.exists('users', 'id = ?', [1]);

      expect(exists).toBe(true);
    });

    it('should return false if no rows exist', async () => {
      mockClient.post.mockResolvedValue([{
        results: [[0]]
      }]);

      const exists = await crud.exists('users', 'id = ?', [999]);

      expect(exists).toBe(false);
    });
  });

  describe('upsert', () => {
    it('should insert if not exists', async () => {
      mockClient.post
        .mockResolvedValueOnce([{ results: [[0]] }]) // count returns 0
        .mockResolvedValueOnce({ success: true });
      mockClient.request.mockResolvedValue({ success: true });

      await crud.upsert(
        'users',
        { id: 1, name: 'John' },
        ['id']
      );

      expect(mockClient.request).toHaveBeenCalledWith(
        '/containers/users/rows',
        expect.objectContaining({
          method: 'PUT'
        })
      );
    });

    it('should update if exists', async () => {
      mockClient.post
        .mockResolvedValueOnce([{ results: [[1]] }]) // count returns 1 (via executeSql -> /sql/dml/query)
        .mockResolvedValueOnce([{ updatedRows: 1 }]); // update (via executeDml -> /sql/update)

      await crud.upsert(
        'users',
        { id: 1, name: 'John Updated' },
        ['id']
      );

      expect(mockClient.post).toHaveBeenCalledTimes(2);
      // Second call should be to the DML update endpoint
      expect(mockClient.post).toHaveBeenLastCalledWith(
        '/sql/update',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'sql-update',
            stmt: expect.stringContaining('UPDATE users SET')
          })
        ])
      );
    });
  });

  describe('truncate', () => {
    it('should delete all rows using DML endpoint', async () => {
      mockClient.post.mockResolvedValue([{ updatedRows: 100 }]);

      await crud.truncate('users');

      expect(mockClient.post).toHaveBeenCalledWith(
        '/sql/update',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'sql-update',
            stmt: 'DELETE FROM users'
          })
        ])
      );
    });
  });

  describe('executeDml', () => {
    it('should use sql-update type and /sql/update endpoint', async () => {
      mockClient.post.mockResolvedValue([{ updatedRows: 1 }]);

      await crud.executeDml('DELETE FROM users WHERE id = 1');

      expect(mockClient.post).toHaveBeenCalledWith(
        '/sql/update',
        [{ type: 'sql-update', stmt: 'DELETE FROM users WHERE id = 1' }]
      );
    });

    it('should include bindings when provided', async () => {
      mockClient.post.mockResolvedValue([{ updatedRows: 1 }]);

      await crud.executeDml('DELETE FROM users WHERE id = ?', [1]);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/sql/update',
        [{ type: 'sql-update', stmt: 'DELETE FROM users WHERE id = ?', bindings: [1] }]
      );
    });

    it('should omit bindings when not provided', async () => {
      mockClient.post.mockResolvedValue([{ updatedRows: 0 }]);

      await crud.executeDml('DELETE FROM users WHERE id = 999');

      const callArgs = mockClient.post.mock.calls[0][1][0];
      expect(callArgs).not.toHaveProperty('bindings');
    });
  });

  describe('executeSql', () => {
    it('should omit bindings when not provided', async () => {
      mockClient.post.mockResolvedValue([{
        columns: [{ name: 'count', type: 'LONG' }],
        results: [[5]]
      }]);

      await crud.executeSql('SELECT COUNT(*) FROM users');

      const callArgs = mockClient.post.mock.calls[0][1][0];
      expect(callArgs).not.toHaveProperty('bindings');
      expect(callArgs.type).toBe('sql-select');
    });

    it('should include bindings when provided', async () => {
      mockClient.post.mockResolvedValue([{
        columns: [{ name: 'id', type: 'INTEGER' }],
        results: [[1]]
      }]);

      await crud.executeSql('SELECT * FROM users WHERE id = ?', [1]);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/sql/dml/query',
        [{ type: 'sql-select', stmt: 'SELECT * FROM users WHERE id = ?', bindings: [1] }]
      );
    });
  });
});
