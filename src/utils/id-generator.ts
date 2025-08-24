/**
 * ID Generation utilities for GridDB
 */

/**
 * Generate a random integer ID within a range
 */
export function generateRandomId(min: number = 1, max: number = 10000): number {
  const randomDecimal = Math.random();
  const scaledNumber = Math.floor(randomDecimal * (max - min + 1)) + min;
  return Math.floor(scaledNumber);
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a timestamp-based ID
 */
export function generateTimestampId(): number {
  return Date.now();
}

/**
 * Generate a snowflake-like ID
 * Combines timestamp, machine ID, and sequence
 */
export class SnowflakeIdGenerator {
  private sequence = 0;
  private lastTimestamp = -1;
  private readonly machineId: number;
  private readonly epoch = 1609459200000; // 2021-01-01

  constructor(machineId: number = 1) {
    if (machineId < 0 || machineId > 1023) {
      throw new Error('Machine ID must be between 0 and 1023');
    }
    this.machineId = machineId;
  }

  generate(): string {
    let timestamp = Date.now() - this.epoch;

    if (timestamp < this.lastTimestamp) {
      throw new Error('Clock moved backwards. Refusing to generate ID');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 0xfff;
      if (this.sequence === 0) {
        // Wait for next millisecond
        while (timestamp <= this.lastTimestamp) {
          timestamp = Date.now() - this.epoch;
        }
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;

    const id = ((timestamp & 0x1ffffffffff) << 22) |
               ((this.machineId & 0x3ff) << 12) |
               (this.sequence & 0xfff);

    return id.toString();
  }
}

/**
 * Generate a short alphanumeric ID
 */
export function generateShortId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * ID Generator factory
 */
export class IdGeneratorFactory {
  private static snowflakeGenerator?: SnowflakeIdGenerator;

  static random(min?: number, max?: number): number {
    return generateRandomId(min, max);
  }

  static uuid(): string {
    return generateUUID();
  }

  static timestamp(): number {
    return generateTimestampId();
  }

  static snowflake(machineId?: number): string {
    if (!this.snowflakeGenerator) {
      this.snowflakeGenerator = new SnowflakeIdGenerator(machineId);
    }
    return this.snowflakeGenerator.generate();
  }

  static short(length?: number): string {
    return generateShortId(length);
  }
}
