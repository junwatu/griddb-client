/**
 * Data transformation utilities for GridDB
 */

import { GridDBRow, GridDBValue, SelectOptions, GridDBQuery } from '../types';

/**
 * Transform object row to array format for GridDB
 */
export function transformRowToArray(row: any): any[] {
  if (Array.isArray(row)) {
    return row;
  }
  
  // If object, convert to array based on property order
  return Object.values(row);
}

/**
 * Transform array row to object format
 */
export function transformArrayToRow(array: any[], columns: string[]): GridDBRow {
  const row: GridDBRow = {};
  
  columns.forEach((col, index) => {
    row[col] = array[index];
  });
  
  return row;
}

/**
 * Build SELECT query from options
 */
export function buildSelectQuery(options: SelectOptions): GridDBQuery {
  const {
    containerName,
    columns,
    where,
    bindings,
    limit,
    offset,
    orderBy,
    order = 'ASC'
  } = options;

  let stmt = 'SELECT ';
  
  // Columns
  stmt += columns && columns.length > 0 ? columns.join(', ') : '*';
  
  // FROM clause
  stmt += ` FROM ${containerName}`;
  
  // WHERE clause
  if (where) {
    stmt += ` WHERE ${where}`;
  }
  
  // ORDER BY clause
  if (orderBy) {
    stmt += ` ORDER BY ${orderBy} ${order}`;
  }
  
  // LIMIT clause
  if (limit !== undefined) {
    stmt += ` LIMIT ${limit}`;
  }
  
  // OFFSET clause
  if (offset !== undefined) {
    stmt += ` OFFSET ${offset}`;
  }

  return {
    type: 'sql-select',
    stmt,
    bindings
  };
}

/**
 * Convert JavaScript value to GridDB compatible value
 */
export function toGridDBValue(value: any): GridDBValue {
  if (value === null || value === undefined) {
    return null;
  }
  
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  if (value instanceof Buffer) {
    return value.toString('base64');
  }
  
  if (value instanceof Blob) {
    // For browser Blob, would need async conversion
    // This is handled at a higher level
    return value;
  }
  
  return value;
}

/**
 * Convert GridDB value to JavaScript value
 */
export function fromGridDBValue(value: any, type?: string): any {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Handle TIMESTAMP type
  if (type === 'TIMESTAMP' && typeof value === 'string') {
    return new Date(value);
  }
  
  // Handle BLOB type (base64 string)
  if (type === 'BLOB' && typeof value === 'string') {
    // Return as base64 string, let consumer decide how to handle
    return value;
  }
  
  return value;
}

/**
 * Escape SQL identifier
 */
export function escapeIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Build INSERT statement
 */
export function buildInsertStatement(
  containerName: string,
  columns: string[],
  rowCount: number = 1
): string {
  const escapedColumns = columns.map(escapeIdentifier).join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const valueRows = Array(rowCount).fill(`(${placeholders})`).join(', ');
  
  return `INSERT INTO ${escapeIdentifier(containerName)} (${escapedColumns}) VALUES ${valueRows}`;
}

/**
 * Parse connection string to config
 */
export function parseConnectionString(connectionString: string): {
  host: string;
  port: number;
  username: string;
  password: string;
} {
  const url = new URL(connectionString);
  
  return {
    host: url.hostname,
    port: parseInt(url.port) || 8080,
    username: url.username,
    password: url.password
  };
}

/**
 * Convert Blob to base64 string (async)
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 string to Blob
 */
export function base64ToBlob(base64: string, mimeType: string = 'application/octet-stream'): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: mimeType });
}
