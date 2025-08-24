/**
 * GridDB Client Library
 * A comprehensive TypeScript client for GridDB Web API
 */

// Export types
export * from './types';

// Export core client
export { GridDBClient } from './core/client';

// Export CRUD operations
export { CRUDOperations } from './operations/crud';

// Export utilities
export * from './utils/transformers';
export * from './utils/id-generator';

// Main GridDB class that combines everything
import { GridDBClient } from './core/client';
import { CRUDOperations } from './operations/crud';
import { 
  GridDBConfig, 
  ClientOptions,
  CreateOptions,
  InsertOptions,
  UpdateOptions,
  DeleteOptions,
  SelectOptions,
  GridDBRow,
  BatchOperationResult,
  QueryResult,
  ContainerInfo
} from './types';

/**
 * Main GridDB class that provides all functionality
 */
export class GridDB {
  public readonly client: GridDBClient;
  public readonly crud: CRUDOperations;

  constructor(config: GridDBConfig | ClientOptions) {
    this.client = new GridDBClient(config);
    this.crud = new CRUDOperations(this.client);
  }

  // Convenience methods that delegate to CRUD operations
  
  async createContainer(options: CreateOptions): Promise<void> {
    return this.crud.createContainer(options);
  }

  async dropContainer(containerName: string): Promise<void> {
    return this.crud.dropContainer(containerName);
  }

  async insert<T = GridDBRow>(options: InsertOptions<T>): Promise<void> {
    return this.crud.insert(options);
  }

  async batchInsert<T = GridDBRow>(
    containerName: string,
    data: T[],
    batchSize?: number
  ): Promise<BatchOperationResult> {
    return this.crud.batchInsert(containerName, data, batchSize);
  }

  async update<T = GridDBRow>(options: UpdateOptions<T>): Promise<void> {
    return this.crud.update(options);
  }

  async delete(options: DeleteOptions): Promise<void> {
    return this.crud.delete(options);
  }

  async select<T = GridDBRow>(options: SelectOptions): Promise<T[]> {
    return this.crud.select(options);
  }

  async selectOne<T = GridDBRow>(options: SelectOptions): Promise<T | null> {
    return this.crud.selectOne(options);
  }

  async count(containerName: string, where?: string, bindings?: any[]): Promise<number> {
    return this.crud.count(containerName, where, bindings);
  }

  async exists(containerName: string, where: string, bindings?: any[]): Promise<boolean> {
    return this.crud.exists(containerName, where, bindings);
  }

  async executeSql(stmt: string, bindings?: any[]): Promise<QueryResult> {
    return this.crud.executeSql(stmt, bindings);
  }

  async executeTql(containerName: string, query: string): Promise<any[]> {
    return this.crud.executeTql(containerName, query);
  }

  async getSchema(containerName: string): Promise<ContainerInfo> {
    return this.crud.getSchema(containerName);
  }

  async truncate(containerName: string): Promise<void> {
    return this.crud.truncate(containerName);
  }

  async upsert<T = GridDBRow>(
    containerName: string,
    data: T,
    uniqueColumns: string[]
  ): Promise<void> {
    return this.crud.upsert(containerName, data, uniqueColumns);
  }

  // Client delegations
  
  async containerExists(containerName: string): Promise<boolean> {
    return this.client.containerExists(containerName);
  }

  async listContainers(): Promise<string[]> {
    return this.client.listContainers();
  }
}

// Default export
export default GridDB;
