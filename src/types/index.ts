/**
 * GridDB Client Library Type Definitions
 */

// Configuration types
export interface GridDBConfig {
  griddbWebApiUrl: string;
  username: string;
  password: string;
  timeout?: number;
  useSSL?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface GridDBCloudConfig extends GridDBConfig {
  cluster: string;
  database: string;
  cloudRegion?: string;
}
// Container types
export type GridDBColumnType = 
  | 'BOOL' 
  | 'STRING' 
  | 'BYTE' 
  | 'SHORT' 
  | 'INTEGER' 
  | 'LONG' 
  | 'FLOAT' 
  | 'DOUBLE' 
  | 'TIMESTAMP' 
  | 'GEOMETRY' 
  | 'BLOB';

export type ContainerType = 'COLLECTION' | 'TIME_SERIES';

export interface GridDBColumn {
  name: string;
  type: GridDBColumnType;
  nullable?: boolean;
  notNull?: boolean;
}

export interface ContainerInfo {
  container_name: string;
  container_type: ContainerType;
  rowkey: boolean;
  columns: GridDBColumn[];
}

// Data types
export type GridDBValue = string | number | boolean | Date | Buffer | Blob | null;

export interface GridDBRow {
  [key: string]: GridDBValue;
}

// Query types
export interface GridDBQuery {
  type: 'sql-select' | 'tql';
  stmt: string;
  bindings?: GridDBValue[];
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

// Response types
export interface GridDBResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: any;
}

export interface QueryResult {
  columns: Array<{
    name: string;
    type: string;
  }>;
  results: any[][];
  total?: number;
}

export interface BatchOperationResult {
  succeeded: number;
  failed: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

// Error handling
export class GridDBError extends Error {
  constructor(
    message: string,
    public readonly code?: string | number,
    public readonly status?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'GridDBError';
    Object.setPrototypeOf(this, GridDBError.prototype);
  }
}

// CRUD operation interfaces
export interface CreateOptions {
  containerName: string;
  columns: GridDBColumn[];
  containerType?: ContainerType;
  rowkey?: boolean;
  ifNotExists?: boolean;
}

export interface InsertOptions<T = any> {
  containerName: string;
  data: T | T[];
  updateIfExists?: boolean;
}

export interface UpdateOptions<T = any> {
  containerName: string;
  data: T;
  where?: string;
  bindings?: GridDBValue[];
}

export interface DeleteOptions {
  containerName: string;
  where: string;
  bindings?: GridDBValue[];
}

export interface SelectOptions {
  containerName: string;
  columns?: string[];
  where?: string;
  bindings?: GridDBValue[];
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

// Client options
export interface ClientOptions {
  config: GridDBConfig;
  logger?: Logger;
  connectionPool?: ConnectionPoolOptions;
}

export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

export interface ConnectionPoolOptions {
  maxConnections?: number;
  minConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

// Export utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
