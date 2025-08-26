/**
 * Integration Test Setup
 * These tests require a real GridDB instance
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GridDB } from '../../src';

// Skip integration tests if no real credentials are provided
const SKIP_INTEGRATION = !process.env.GRIDDB_TEST_URL || 
                         !process.env.GRIDDB_TEST_USERNAME || 
                         !process.env.GRIDDB_TEST_PASSWORD;

export const integrationTest = SKIP_INTEGRATION ? describe.skip : describe;

export function getTestClient(): GridDB | null {
  if (SKIP_INTEGRATION) {
    console.warn('⚠️  Integration tests skipped - no test credentials provided');
    console.warn('   Set GRIDDB_TEST_URL, GRIDDB_TEST_USERNAME, and GRIDDB_TEST_PASSWORD to run');
    return null;
  }

  return new GridDB({
    griddbWebApiUrl: process.env.GRIDDB_TEST_URL!,
    username: process.env.GRIDDB_TEST_USERNAME!,
    password: process.env.GRIDDB_TEST_PASSWORD!
  });
}

// Test container cleanup helper
export async function cleanupTestContainers(client: GridDB, prefix: string = 'test_') {
  try {
    const containers = await client.listContainers();
    const testContainers = containers.filter(c => c.startsWith(prefix));
    
    for (const container of testContainers) {
      try {
        await client.dropContainer(container);
        console.log(`Cleaned up test container: ${container}`);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  } catch (err) {
    // Ignore if list fails
  }
}
