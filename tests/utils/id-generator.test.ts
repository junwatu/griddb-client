import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRandomId,
  generateUUID,
  generateTimestampId,
  generateShortId,
  SnowflakeIdGenerator,
  IdGeneratorFactory
} from '../../src/utils/id-generator';

describe('ID Generators', () => {
  describe('generateRandomId', () => {
    it('should generate ID within default range', () => {
      const id = generateRandomId();
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(10000);
      expect(Number.isInteger(id)).toBe(true);
    });

    it('should generate ID within custom range', () => {
      const id = generateRandomId(100, 200);
      expect(id).toBeGreaterThanOrEqual(100);
      expect(id).toBeLessThanOrEqual(200);
    });

    it('should generate different IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateRandomId());
      }
      // Should have many unique values (not all the same)
      expect(ids.size).toBeGreaterThan(50);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID v4 format', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('generateTimestampId', () => {
    it('should generate timestamp-based ID', () => {
      const before = Date.now();
      const id = generateTimestampId();
      const after = Date.now();
      
      expect(id).toBeGreaterThanOrEqual(before);
      expect(id).toBeLessThanOrEqual(after);
    });

    it('should generate increasing IDs over time', async () => {
      const id1 = generateTimestampId();
      await new Promise(resolve => setTimeout(resolve, 10));
      const id2 = generateTimestampId();
      
      expect(id2).toBeGreaterThan(id1);
    });
  });

  describe('generateShortId', () => {
    it('should generate ID with default length', () => {
      const id = generateShortId();
      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate ID with custom length', () => {
      const id = generateShortId(16);
      expect(id).toHaveLength(16);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate different IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateShortId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('SnowflakeIdGenerator', () => {
    let generator: SnowflakeIdGenerator;

    beforeEach(() => {
      generator = new SnowflakeIdGenerator(1);
    });

    it('should generate valid snowflake ID', () => {
      const id = generator.generate();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(generator.generate());
      }
      expect(ids.size).toBe(1000);
    });

    it('should throw error for invalid machine ID', () => {
      expect(() => new SnowflakeIdGenerator(-1)).toThrow('Machine ID must be between 0 and 1023');
      expect(() => new SnowflakeIdGenerator(1024)).toThrow('Machine ID must be between 0 and 1023');
    });

    it('should handle machine ID properly', () => {
      const gen1 = new SnowflakeIdGenerator(1);
      const gen2 = new SnowflakeIdGenerator(2);
      
      const id1 = gen1.generate();
      const id2 = gen2.generate();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('IdGeneratorFactory', () => {
    it('should generate random ID', () => {
      const id = IdGeneratorFactory.random();
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(10000);
    });

    it('should generate random ID with custom range', () => {
      const id = IdGeneratorFactory.random(50, 100);
      expect(id).toBeGreaterThanOrEqual(50);
      expect(id).toBeLessThanOrEqual(100);
    });

    it('should generate UUID', () => {
      const uuid = IdGeneratorFactory.uuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate timestamp ID', () => {
      const id = IdGeneratorFactory.timestamp();
      expect(id).toBeLessThanOrEqual(Date.now());
      expect(id).toBeGreaterThan(Date.now() - 1000);
    });

    it('should generate snowflake ID', () => {
      const id = IdGeneratorFactory.snowflake();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('should reuse snowflake generator', () => {
      const id1 = IdGeneratorFactory.snowflake();
      const id2 = IdGeneratorFactory.snowflake();
      
      expect(id1).not.toBe(id2);
      // Both should be generated from the same instance
      expect(Number(id2)).toBeGreaterThan(Number(id1));
    });

    it('should generate short ID', () => {
      const id = IdGeneratorFactory.short();
      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate short ID with custom length', () => {
      const id = IdGeneratorFactory.short(12);
      expect(id).toHaveLength(12);
    });
  });
});
