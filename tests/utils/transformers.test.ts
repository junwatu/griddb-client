import { describe, it, expect } from 'vitest';
import {
  transformRowToArray,
  transformArrayToRow,
  buildSelectQuery,
  toGridDBValue,
  fromGridDBValue,
  escapeIdentifier,
  buildInsertStatement,
  base64ToBlob
} from '../../src/utils/transformers';

describe('Transformers', () => {
  describe('transformRowToArray', () => {
    it('should transform object to array', () => {
      const row = { id: 1, name: 'John', age: 30 };
      const result = transformRowToArray(row);
      
      expect(result).toEqual([1, 'John', 30]);
    });

    it('should return array as-is', () => {
      const row = [1, 'John', 30];
      const result = transformRowToArray(row);
      
      expect(result).toEqual([1, 'John', 30]);
    });

    it('should handle empty object', () => {
      const row = {};
      const result = transformRowToArray(row);
      
      expect(result).toEqual([]);
    });
  });

  describe('transformArrayToRow', () => {
    it('should transform array to object', () => {
      const array = [1, 'John', 30];
      const columns = ['id', 'name', 'age'];
      const result = transformArrayToRow(array, columns);
      
      expect(result).toEqual({ id: 1, name: 'John', age: 30 });
    });

    it('should handle mismatched lengths', () => {
      const array = [1, 'John'];
      const columns = ['id', 'name', 'age'];
      const result = transformArrayToRow(array, columns);
      
      expect(result).toEqual({ id: 1, name: 'John', age: undefined });
    });

    it('should handle empty arrays', () => {
      const result = transformArrayToRow([], []);
      
      expect(result).toEqual({});
    });
  });

  describe('buildSelectQuery', () => {
    it('should build basic SELECT query', () => {
      const result = buildSelectQuery({
        containerName: 'users'
      });
      
      expect(result.type).toBe('sql-select');
      expect(result.stmt).toBe('SELECT * FROM users');
      expect(result.bindings).toBeUndefined();
    });

    it('should build query with specific columns', () => {
      const result = buildSelectQuery({
        containerName: 'users',
        columns: ['id', 'name']
      });
      
      expect(result.stmt).toBe('SELECT id, name FROM users');
    });

    it('should build query with WHERE clause', () => {
      const result = buildSelectQuery({
        containerName: 'users',
        where: 'age > ?',
        bindings: [18]
      });
      
      expect(result.stmt).toBe('SELECT * FROM users WHERE age > ?');
      expect(result.bindings).toEqual([18]);
    });

    it('should build query with ORDER BY', () => {
      const result = buildSelectQuery({
        containerName: 'users',
        orderBy: 'name',
        order: 'DESC'
      });
      
      expect(result.stmt).toBe('SELECT * FROM users ORDER BY name DESC');
    });

    it('should build query with LIMIT and OFFSET', () => {
      const result = buildSelectQuery({
        containerName: 'users',
        limit: 10,
        offset: 20
      });
      
      expect(result.stmt).toBe('SELECT * FROM users LIMIT 10 OFFSET 20');
    });

    it('should build complex query', () => {
      const result = buildSelectQuery({
        containerName: 'users',
        columns: ['id', 'name'],
        where: 'age > ? AND status = ?',
        bindings: [18, 'active'],
        orderBy: 'created_at',
        order: 'DESC',
        limit: 5,
        offset: 10
      });
      
      expect(result.stmt).toBe(
        'SELECT id, name FROM users WHERE age > ? AND status = ? ORDER BY created_at DESC LIMIT 5 OFFSET 10'
      );
      expect(result.bindings).toEqual([18, 'active']);
    });
  });

  describe('toGridDBValue', () => {
    it('should handle null and undefined', () => {
      expect(toGridDBValue(null)).toBe(null);
      expect(toGridDBValue(undefined)).toBe(null);
    });

    it('should convert Date to ISO string', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = toGridDBValue(date);
      
      expect(result).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should convert Buffer to base64', () => {
      const buffer = Buffer.from('hello world');
      const result = toGridDBValue(buffer);
      
      expect(result).toBe('aGVsbG8gd29ybGQ=');
    });

    it('should preserve Blob as-is', () => {
      const blob = new Blob(['test']);
      const result = toGridDBValue(blob);
      
      expect(result).toBe(blob);
    });

    it('should preserve other values', () => {
      expect(toGridDBValue('string')).toBe('string');
      expect(toGridDBValue(123)).toBe(123);
      expect(toGridDBValue(true)).toBe(true);
    });
  });

  describe('fromGridDBValue', () => {
    it('should handle null and undefined', () => {
      expect(fromGridDBValue(null)).toBe(null);
      expect(fromGridDBValue(undefined)).toBe(null);
    });

    it('should convert TIMESTAMP string to Date', () => {
      const result = fromGridDBValue('2024-01-01T00:00:00.000Z', 'TIMESTAMP');
      
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should return BLOB as base64 string', () => {
      const base64 = 'aGVsbG8gd29ybGQ=';
      const result = fromGridDBValue(base64, 'BLOB');
      
      expect(result).toBe(base64);
    });

    it('should preserve other values', () => {
      expect(fromGridDBValue('string')).toBe('string');
      expect(fromGridDBValue(123)).toBe(123);
      expect(fromGridDBValue(true)).toBe(true);
    });
  });

  describe('escapeIdentifier', () => {
    it('should escape normal identifier', () => {
      expect(escapeIdentifier('column_name')).toBe('"column_name"');
    });

    it('should escape identifier with quotes', () => {
      expect(escapeIdentifier('column"name')).toBe('"column""name"');
    });

    it('should escape identifier with multiple quotes', () => {
      expect(escapeIdentifier('col"umn"name')).toBe('"col""umn""name"');
    });
  });

  describe('buildInsertStatement', () => {
    it('should build INSERT statement for single row', () => {
      const result = buildInsertStatement('users', ['id', 'name', 'age']);
      
      expect(result).toBe(
        'INSERT INTO "users" ("id", "name", "age") VALUES (?, ?, ?)'
      );
    });

    it('should build INSERT statement for multiple rows', () => {
      const result = buildInsertStatement('users', ['id', 'name'], 3);
      
      expect(result).toBe(
        'INSERT INTO "users" ("id", "name") VALUES (?, ?), (?, ?), (?, ?)'
      );
    });

    it('should handle special characters in table name', () => {
      const result = buildInsertStatement('user"table', ['id']);
      
      expect(result).toBe(
        'INSERT INTO "user""table" ("id") VALUES (?)'
      );
    });
  });

  describe('base64ToBlob', () => {
    it('should convert base64 to Blob', () => {
      const base64 = 'aGVsbG8gd29ybGQ='; // "hello world"
      const blob = base64ToBlob(base64);
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/octet-stream');
      expect(blob.size).toBe(11); // "hello world" is 11 bytes
    });

    it('should convert with custom MIME type', () => {
      const base64 = 'aGVsbG8gd29ybGQ=';
      const blob = base64ToBlob(base64, 'text/plain');
      
      expect(blob.type).toBe('text/plain');
    });

    it('should handle empty base64', () => {
      const blob = base64ToBlob('');
      
      expect(blob.size).toBe(0);
    });
  });
});
