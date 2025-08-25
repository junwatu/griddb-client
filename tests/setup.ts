/**
 * Test setup and global configurations
 */

import { vi } from 'vitest';

// Mock environment variables for testing
process.env.GRIDDB_WEBAPI_URL = 'http://localhost:8080/griddb/v2';
process.env.GRIDDB_USERNAME = 'test_user';
process.env.GRIDDB_PASSWORD = 'test_password';

// Global test utilities
global.createMockResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

// Setup fetch mock
global.fetch = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
