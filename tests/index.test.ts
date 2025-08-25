import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GridDB, GridDBClient, CRUDOperations, IdGeneratorFactory } from '../src';
import * as transformers from '../src/utils/transformers';

describe('GridDB Main Class', () => {
  let griddb: GridDB;
  let mockCrudMethods: any;

  beforeEach(() => {
    // Mock all CRUD methods
    mockCrudMethods = {
      createContainer: vi.fn(),
      dropContainer: vi.fn(),
      insert: vi.fn(),
      batchInsert: vi.fn().mockResolvedValue({ succeeded: 10, failed: 0 }),
      update: vi.fn(),
      delete: vi.fn(),
      select: vi.fn().mockResolvedValue([]),
      selectOne: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      exists: vi.fn().mockResolvedValue(false),
      executeSql: vi.fn().mockResolvedValue({ columns: [], results: [] }),
      executeTql: vi.fn().mockResolvedValue([]),
      getSchema: vi.fn().mockResolvedValue({}),
      truncate: vi.fn(),
      upsert: vi.fn()
    };

    // Mock GridDBClient methods
    const mockClientMethods = {
      containerExists: vi.fn().mockResolvedValue(false),
      listContainers: vi.fn().mockResolvedValue([])
    };

    // Create GridDB instance with mocked dependencies
    griddb = new GridDB({
      griddbWebApiUrl: 'http://test.griddb.com',
      username: 'test',
      password: 'test'
    });

    // Replace methods with mocks
    Object.assign(griddb.crud, mockCrudMethods);
    griddb.client.containerExists = mockClientMethods.containerExists;
    griddb.client.listContainers = mockClientMethods.listContainers;
  });

  describe('constructor', () => {
    it('should create GridDB instance with config', () => {
      const db = new GridDB({
        griddbWebApiUrl: 'http://test.griddb.com',
        username: 'test',
        password: 'test'
      });

      expect(db).toBeInstanceOf(GridDB);
      expect(db.client).toBeInstanceOf(GridDBClient);
      expect(db.crud).toBeInstanceOf(CRUDOperations);
    });

    it('should create GridDB instance with ClientOptions', () => {
      const db = new GridDB({
        config: {
          griddbWebApiUrl: 'http://test.griddb.com',
          username: 'test',
          password: 'test'
        }
      });

      expect(db).toBeInstanceOf(GridDB);
    });
  });

  describe('CRUD delegation methods', () => {
    it('should delegate createContainer to crud', async () => {
      const options = {
        containerName: 'test',
        columns: [{ name: 'id', type: 'INTEGER' as const }]
      };
      
      await griddb.createContainer(options);
      
      expect(mockCrudMethods.createContainer).toHaveBeenCalledWith(options);
    });

    it('should delegate dropContainer to crud', async () => {
      await griddb.dropContainer('test');
      
      expect(mockCrudMethods.dropContainer).toHaveBeenCalledWith('test');
    });

    it('should delegate insert to crud', async () => {
      const options = {
        containerName: 'test',
        data: { id: 1, name: 'test' }
      };
      
      await griddb.insert(options);
      
      expect(mockCrudMethods.insert).toHaveBeenCalledWith(options);
    });

    it('should delegate batchInsert to crud', async () => {
      const data = [{ id: 1 }, { id: 2 }];
      
      const result = await griddb.batchInsert('test', data, 100);
      
      expect(mockCrudMethods.batchInsert).toHaveBeenCalledWith('test', data, 100);
      expect(result).toEqual({ succeeded: 10, failed: 0 });
    });

    it('should delegate update to crud', async () => {
      const options = {
        containerName: 'test',
        data: { id: 1, name: 'updated' }
      };
      
      await griddb.update(options);
      
      expect(mockCrudMethods.update).toHaveBeenCalledWith(options);
    });

    it('should delegate delete to crud', async () => {
      const options = {
        containerName: 'test',
        where: 'id = ?',
        bindings: [1]
      };
      
      await griddb.delete(options);
      
      expect(mockCrudMethods.delete).toHaveBeenCalledWith(options);
    });

    it('should delegate select to crud', async () => {
      const options = {
        containerName: 'test',
        where: 'id > ?',
        bindings: [0]
      };
      
      const result = await griddb.select(options);
      
      expect(mockCrudMethods.select).toHaveBeenCalledWith(options);
      expect(result).toEqual([]);
    });

    it('should delegate selectOne to crud', async () => {
      const options = {
        containerName: 'test',
        where: 'id = ?',
        bindings: [1]
      };
      
      const result = await griddb.selectOne(options);
      
      expect(mockCrudMethods.selectOne).toHaveBeenCalledWith(options);
      expect(result).toBeNull();
    });

    it('should delegate count to crud', async () => {
      const result = await griddb.count('test', 'status = ?', ['active']);
      
      expect(mockCrudMethods.count).toHaveBeenCalledWith('test', 'status = ?', ['active']);
      expect(result).toBe(0);
    });

    it('should delegate exists to crud', async () => {
      const result = await griddb.exists('test', 'id = ?', [1]);
      
      expect(mockCrudMethods.exists).toHaveBeenCalledWith('test', 'id = ?', [1]);
      expect(result).toBe(false);
    });

    it('should delegate executeSql to crud', async () => {
      const result = await griddb.executeSql('SELECT * FROM test', []);
      
      expect(mockCrudMethods.executeSql).toHaveBeenCalledWith('SELECT * FROM test', []);
      expect(result).toEqual({ columns: [], results: [] });
    });

    it('should delegate executeTql to crud', async () => {
      const result = await griddb.executeTql('test', 'select *');
      
      expect(mockCrudMethods.executeTql).toHaveBeenCalledWith('test', 'select *');
      expect(result).toEqual([]);
    });

    it('should delegate getSchema to crud', async () => {
      const result = await griddb.getSchema('test');
      
      expect(mockCrudMethods.getSchema).toHaveBeenCalledWith('test');
      expect(result).toEqual({});
    });

    it('should delegate truncate to crud', async () => {
      await griddb.truncate('test');
      
      expect(mockCrudMethods.truncate).toHaveBeenCalledWith('test');
    });

    it('should delegate upsert to crud', async () => {
      const data = { id: 1, name: 'test' };
      const uniqueColumns = ['id'];
      
      await griddb.upsert('test', data, uniqueColumns);
      
      expect(mockCrudMethods.upsert).toHaveBeenCalledWith('test', data, uniqueColumns);
    });
  });

  describe('Client delegation methods', () => {
    it('should delegate containerExists to client', async () => {
      griddb.client.containerExists = vi.fn().mockResolvedValue(true);
      
      const result = await griddb.containerExists('test');
      
      expect(griddb.client.containerExists).toHaveBeenCalledWith('test');
      expect(result).toBe(true);
    });

    it('should delegate listContainers to client', async () => {
      griddb.client.listContainers = vi.fn().mockResolvedValue(['container1', 'container2']);
      
      const result = await griddb.listContainers();
      
      expect(griddb.client.listContainers).toHaveBeenCalled();
      expect(result).toEqual(['container1', 'container2']);
    });
  });
});

describe('Module Exports', () => {
  it('should export GridDB as default', async () => {
    const module = await import('../src');
    expect(module.default).toBe(GridDB);
  });

  it('should export all necessary components', () => {
    expect(GridDB).toBeDefined();
    expect(GridDBClient).toBeDefined();
    expect(CRUDOperations).toBeDefined();
    expect(IdGeneratorFactory).toBeDefined();
  });

  it('should export transformer utilities', () => {
    expect(transformers.transformRowToArray).toBeDefined();
    expect(transformers.transformArrayToRow).toBeDefined();
    expect(transformers.buildSelectQuery).toBeDefined();
    expect(transformers.toGridDBValue).toBeDefined();
    expect(transformers.fromGridDBValue).toBeDefined();
    expect(transformers.escapeIdentifier).toBeDefined();
    expect(transformers.buildInsertStatement).toBeDefined();
    expect(transformers.base64ToBlob).toBeDefined();
  });
});
