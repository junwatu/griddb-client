/**
 * CRUD Operations for GridDB
 * Provides high-level database operations
 */

import { GridDBClient } from '../core/client';
import {
  CreateOptions,
  InsertOptions,
  UpdateOptions,
  DeleteOptions,
  SelectOptions,
  GridDBQuery,
  QueryResult,
  GridDBRow,
  BatchOperationResult,
  ContainerInfo
} from '../types';
import { transformRowToArray, transformArrayToRow, buildSelectQuery } from '../utils/transformers';

export class CRUDOperations {
  constructor(private client: GridDBClient) {}

  /**
   * Create a new container
   */
  async createContainer(options: CreateOptions): Promise<void> {
    const {
      containerName,
      columns,
      containerType = 'COLLECTION',
      rowkey = true,
      ifNotExists = true
    } = options;

    // Check if container exists
    if (ifNotExists) {
      const exists = await this.client.containerExists(containerName);
      if (exists) {
        return;
      }
    }

    const payload = {
      container_name: containerName,
      container_type: containerType,
      rowkey,
      columns
    };

    await this.client.post('/containers', payload);
  }

  /**
   * Drop a container
   */
  async dropContainer(containerName: string): Promise<void> {
    await this.client.delete(`/containers/${containerName}`);
  }

  /**
   * Insert data into container
   */
  async insert<T = GridDBRow>(options: InsertOptions<T>): Promise<void> {
    const { containerName, data, updateIfExists = false } = options;
    
    const rows = Array.isArray(data) ? data : [data];
    const transformedRows = rows.map(row => transformRowToArray(row));
    
    // Use POST for insert, PUT for update
    const method = updateIfExists ? 'PUT' : 'POST';
    await this.client.request(`/containers/${containerName}/rows`, {
      method,
      body: transformedRows
    });
  }

  /**
   * Batch insert with error handling
   */
  async batchInsert<T = GridDBRow>(
    containerName: string,
    data: T[],
    batchSize: number = 100
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      succeeded: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        await this.insert({
          containerName,
          data: batch,
          updateIfExists: true
        });
        result.succeeded += batch.length;
      } catch (error) {
        result.failed += batch.length;
        result.errors?.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Update data in container
   */
  async update<T = GridDBRow>(options: UpdateOptions<T>): Promise<void> {
    const { containerName, data, where, bindings } = options;
    
    if (!where) {
      // If no where clause, update by rowkey (first column)
      await this.insert({
        containerName,
        data,
        updateIfExists: true
      });
    } else {
      // Use SQL UPDATE statement
      const columns = Object.keys(data as any);
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const values = columns.map(col => (data as any)[col]);
      
      const stmt = `UPDATE ${containerName} SET ${setClause} WHERE ${where}`;
      const allBindings = [...values, ...(bindings || [])];
      
      await this.executeSql(stmt, allBindings);
    }
  }

  /**
   * Delete data from container
   */
  async delete(options: DeleteOptions): Promise<void> {
    const { containerName, where, bindings } = options;
    
    const stmt = `DELETE FROM ${containerName} WHERE ${where}`;
    await this.executeSql(stmt, bindings);
  }

  /**
   * Select data from container
   */
  async select<T = GridDBRow>(options: SelectOptions): Promise<T[]> {
    const query = buildSelectQuery(options);
    const result = await this.executeSql(query.stmt, query.bindings);
    
    if (!result.results || result.results.length === 0) {
      return [];
    }

    // Transform array results to objects
    return result.results.map(row => 
      transformArrayToRow(row, result.columns.map(c => c.name)) as T
    );
  }

  /**
   * Select one row
   */
  async selectOne<T = GridDBRow>(options: SelectOptions): Promise<T | null> {
    const results = await this.select<T>({ ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Count rows in container
   */
  async count(containerName: string, where?: string, bindings?: any[]): Promise<number> {
    const whereClause = where ? ` WHERE ${where}` : '';
    const stmt = `SELECT COUNT(*) FROM ${containerName}${whereClause}`;
    
    const result = await this.executeSql(stmt, bindings);
    return result.results?.[0]?.[0] || 0;
  }

  /**
   * Execute raw SQL query
   */
  async executeSql(stmt: string, bindings?: any[]): Promise<QueryResult> {
    const query: GridDBQuery = {
      type: 'sql-select',
      stmt,
      bindings
    };

    const response = await this.client.post('/sql/dml/query', [query]);
    
    // Handle response format
    if (Array.isArray(response) && response.length > 0) {
      return response[0];
    }
    
    return {
      columns: [],
      results: []
    };
  }

  /**
   * Execute TQL query
   */
  async executeTql(containerName: string, query: string): Promise<any[]> {
    const tqlQuery: GridDBQuery = {
      type: 'tql',
      stmt: query
    };

    const response = await this.client.post(`/containers/${containerName}/tql`, tqlQuery);
    return response.results || [];
  }

  /**
   * Check if row exists
   */
  async exists(containerName: string, where: string, bindings?: any[]): Promise<boolean> {
    const count = await this.count(containerName, where, bindings);
    return count > 0;
  }

  /**
   * Get container schema
   */
  async getSchema(containerName: string): Promise<ContainerInfo> {
    return this.client.getContainerInfo(containerName);
  }

  /**
   * Truncate container (delete all rows)
   */
  async truncate(containerName: string): Promise<void> {
    await this.executeSql(`DELETE FROM ${containerName}`);
  }

  /**
   * Upsert operation (insert or update)
   */
  async upsert<T = GridDBRow>(
    containerName: string,
    data: T,
    uniqueColumns: string[]
  ): Promise<void> {
    // Build WHERE clause from unique columns
    const whereConditions = uniqueColumns.map(col => `${col} = ?`).join(' AND ');
    const whereBindings = uniqueColumns.map(col => (data as any)[col]);
    
    const exists = await this.exists(containerName, whereConditions, whereBindings);
    
    if (exists) {
      await this.update({
        containerName,
        data,
        where: whereConditions,
        bindings: whereBindings
      });
    } else {
      await this.insert({
        containerName,
        data
      });
    }
  }
}
