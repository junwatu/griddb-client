# @junwatu/griddb-client

[![npm version](https://badge.fury.io/js/%40junwatu%2Fgriddb-client.svg)](https://www.npmjs.com/package/@junwatu/griddb-client)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive TypeScript/JavaScript client library for GridDB Web API with full CRUD operations support.

## Features

- 🚀 **Full CRUD Operations**: Create, Read, Update, Delete with ease
- 🔄 **Batch Operations**: Efficient batch inserts with error handling
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions
- 🔌 **Connection Management**: Automatic retry logic and connection pooling
- 🎯 **SQL & TQL Support**: Execute both SQL and TQL queries
- 🔧 **Utility Functions**: ID generation, data transformation, and more
- 📊 **Container Management**: Create, drop, and manage GridDB containers
- ⚡ **Performance Optimized**: Batching, connection reuse, and efficient transformations

## Installation

```bash
npm install @junwatu/griddb-client
```

or

```bash
yarn add @junwatu/griddb-client
```

## Quick Start

### 1. Set up environment variables

Create a `.env` file in your project root:

```env
GRIDDB_WEBAPI_URL=http://localhost:8080/griddb/v2
GRIDDB_USERNAME=admin
GRIDDB_PASSWORD=admin
```

### 2. Basic Usage

```typescript
import { GridDB } from '@junwatu/griddb-client';

// Initialize the client
const griddb = new GridDB({
  griddbWebApiUrl: process.env.GRIDDB_WEBAPI_URL!,
  username: process.env.GRIDDB_USERNAME!,
  password: process.env.GRIDDB_PASSWORD!
});

// Create a container
await griddb.createContainer({
  containerName: 'users',
  columns: [
    { name: 'id', type: 'INTEGER' },
    { name: 'name', type: 'STRING' },
    { name: 'email', type: 'STRING' },
    { name: 'created_at', type: 'TIMESTAMP' }
  ]
});

// Insert data
await griddb.insert({
  containerName: 'users',
  data: {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    created_at: new Date()
  }
});

// Query data
const users = await griddb.select({
  containerName: 'users',
  where: 'name = ?',
  bindings: ['John Doe']
});

console.log(users);
```

## API Documentation

### API Overview

| Method | Description |
|--------|-------------|
| `createContainer(options)` | Create a new container |
| `dropContainer(name)` | Drop a container |
| `listContainers()` | List all containers |
| `containerExists(name)` | Check if container exists |
| `getSchema(name)` | Get container schema |
| `insert(options)` | Insert one or more rows |
| `batchInsert(name, data, batchSize)` | Batch insert with error handling |
| `select(options)` | Query rows with conditions |
| `selectOne(options)` | Query a single row |
| `count(name, where?, bindings?)` | Count rows |
| `exists(name, where, bindings?)` | Check if rows exist |
| `update(options)` | Update rows (by rowkey or WHERE clause) |
| `delete(options)` | Delete rows by condition |
| `truncate(name)` | Delete all rows from container |
| `upsert(name, data, uniqueColumns)` | Insert or update |
| `executeSql(stmt, bindings?)` | Execute raw SELECT query |
| `executeDml(stmt, bindings?)` | Execute raw DML (INSERT/UPDATE/DELETE) |
| `executeTql(name, query)` | Execute TQL query |

### Initialization

```typescript
import { GridDB, GridDBConfig } from '@junwatu/griddb-client';

const config: GridDBConfig = {
  griddbWebApiUrl: 'http://localhost:8080/griddb/v2',
  username: 'admin',
  password: 'admin',
  timeout: 30000,        // Optional: Request timeout in ms (default: 30000)
  retryAttempts: 3,      // Optional: Number of retry attempts (default: 3)
  retryDelay: 1000       // Optional: Delay between retries in ms (default: 1000)
};

const griddb = new GridDB(config);
```

### Container Operations

#### Create Container

```typescript
await griddb.createContainer({
  containerName: 'my_container',
  columns: [
    { name: 'id', type: 'INTEGER' },
    { name: 'data', type: 'BLOB' },
    { name: 'timestamp', type: 'TIMESTAMP' }
  ],
  containerType: 'COLLECTION',  // or 'TIME_SERIES'
  rowkey: true,                  // First column as primary key
  ifNotExists: true              // Don't error if exists
});
```

#### Drop Container

```typescript
await griddb.dropContainer('my_container');
```

#### List Containers

```typescript
const containers = await griddb.listContainers();
console.log(containers); // ['users', 'products', ...]
```

### CRUD Operations

#### Insert

```typescript
// Object-based insert (property order doesn't matter)
await griddb.insert({
  containerName: 'users',
  data: { name: 'Alice', email: 'alice@example.com', id: 1 }
});

// Multiple insert with objects
await griddb.insert({
  containerName: 'users',
  data: [
    { name: 'Bob', email: 'bob@example.com', id: 2 },
    { name: 'Charlie', email: 'charlie@example.com', id: 3 }
  ]
});

// Mixed object and array data
await griddb.insert({
  containerName: 'users',
  data: [
    { name: 'Dave', email: 'dave@example.com', id: 4 },
    [5, 'Eve', 'eve@example.com'] // Arrays must follow column order
  ]
});

// Batch insert with error handling
const result = await griddb.batchInsert('users', largeDataArray, 100);
console.log(`Succeeded: ${result.succeeded}, Failed: ${result.failed}`);
```

#### Select

```typescript
// Select all
const allUsers = await griddb.select({ containerName: 'users' });

// Select with conditions
const activeUsers = await griddb.select({
  containerName: 'users',
  columns: ['id', 'name', 'email'],
  where: 'status = ? AND created_at > ?',
  bindings: ['active', '2024-01-01'],
  orderBy: 'created_at',
  order: 'DESC',
  limit: 10,
  offset: 0
});

// Select one
const user = await griddb.selectOne({
  containerName: 'users',
  where: 'id = ?',
  bindings: [1]
});
```

#### Update

```typescript
// Update by primary key
await griddb.update({
  containerName: 'users',
  data: { id: 1, name: 'Alice Updated', email: 'alice.new@example.com' }
});

// Update with conditions
await griddb.update({
  containerName: 'users',
  data: { status: 'inactive' },
  where: 'last_login < ?',
  bindings: ['2023-01-01']
});
```

#### Delete

```typescript
await griddb.delete({
  containerName: 'users',
  where: 'id = ?',
  bindings: [1]
});
```

#### Upsert

```typescript
await griddb.upsert(
  'users',
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  ['id']  // Unique columns to check
);
```

#### Truncate

```typescript
// Delete all rows from a container
await griddb.truncate('users');
```

### Query Execution

#### SQL Queries (SELECT)

Use `executeSql` for read-only SELECT queries. This sends `type: 'sql-select'` to the `/sql/dml/query` endpoint.

```typescript
const result = await griddb.executeSql(
  'SELECT * FROM users WHERE age > ? ORDER BY name',
  [18]
);
console.log(result.results);
```

#### SQL DML Statements (INSERT, UPDATE, DELETE)

Use `executeDml` for data modification statements. This sends `type: 'sql-update'` to the `/sql/update` endpoint, which is required by GridDB Cloud Web API for DML operations.

```typescript
// Delete with raw SQL
const result = await griddb.executeDml(
  'DELETE FROM users WHERE status = ?',
  ['inactive']
);
console.log(result.updatedRows);

// Update with raw SQL
await griddb.executeDml(
  'UPDATE users SET status = ? WHERE last_login < ?',
  ['inactive', '2023-01-01']
);
```

> **Note:** The high-level `delete()`, `update()`, and `truncate()` methods use `executeDml` internally. You only need `executeDml` directly for complex DML statements not covered by the convenience methods.

#### TQL Queries

```typescript
const result = await griddb.executeTql(
  'users',
  'select * where age > 18'
);
```

### Utility Functions

#### ID Generation

```typescript
import { IdGeneratorFactory } from '@junwatu/griddb-client';

// Random integer ID (1-10000)
const randomId = IdGeneratorFactory.random();

// UUID v4
const uuid = IdGeneratorFactory.uuid();

// Timestamp-based ID
const timestampId = IdGeneratorFactory.timestamp();

// Snowflake-like ID
const snowflakeId = IdGeneratorFactory.snowflake();

// Short alphanumeric ID
const shortId = IdGeneratorFactory.short(8);
```

#### Data Transformation

```typescript
import { blobToBase64, base64ToBlob } from '@junwatu/griddb-client';

// Convert Blob to base64 for storage
const base64 = await blobToBase64(imageBlob);

// Convert base64 back to Blob
const blob = base64ToBlob(base64String, 'image/jpeg');
```

## Advanced Usage

### Custom Logger

```typescript
const griddb = new GridDB({
  config: {
    griddbWebApiUrl: '...',
    username: '...',
    password: '...'
  },
  logger: {
    debug: (msg, ...args) => console.debug(msg, ...args),
    info: (msg, ...args) => console.info(msg, ...args),
    warn: (msg, ...args) => console.warn(msg, ...args),
    error: (msg, ...args) => console.error(msg, ...args)
  }
});
```

### Working with BLOBs

```typescript
// Store image as BLOB
const imageBuffer = await fs.readFile('image.jpg');
const base64Image = imageBuffer.toString('base64');

await griddb.insert({
  containerName: 'images',
  data: {
    id: 1,
    image_data: base64Image,
    mime_type: 'image/jpeg'
  }
});

// Retrieve and convert back
const result = await griddb.selectOne({
  containerName: 'images',
  where: 'id = ?',
  bindings: [1]
});

if (result) {
  const imageBlob = base64ToBlob(result.image_data, result.mime_type);
  // Use imageBlob...
}
```

### Error Handling

```typescript
import { GridDBError } from '@junwatu/griddb-client';

try {
  await griddb.insert({
    containerName: 'users',
    data: { id: 1, name: 'Test' }
  });
} catch (error) {
  if (error instanceof GridDBError) {
    console.error('GridDB Error:', error.message);
    console.error('Status:', error.status);
    console.error('Details:', error.details);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Type Definitions

The library exports all type definitions for use in your TypeScript projects:

```typescript
import {
  GridDBConfig,
  GridDBColumn,
  GridDBRow,
  GridDBQuery,
  ContainerType,
  GridDBColumnType,
  CreateOptions,
  InsertOptions,
  SelectOptions,
  UpdateOptions,
  DeleteOptions,
  QueryResult,
  BatchOperationResult
} from '@junwatu/griddb-client';
```

### GridDBQuery Type

```typescript
interface GridDBQuery {
  type: 'sql-select' | 'sql-update' | 'tql';
  stmt: string;
  bindings?: GridDBValue[];
}
```

- `sql-select` — Used for SELECT queries via `/sql/dml/query`
- `sql-update` — Used for DML statements (INSERT, UPDATE, DELETE) via `/sql/update`
- `tql` — Used for TQL queries

## GridDB Cloud

This library fully supports [GridDB Cloud](https://cloud.griddb.com). GridDB Cloud's Web API strictly separates SELECT queries from DML (data modification) operations at the endpoint level:

| Operation | API Type | Endpoint |
|-----------|----------|----------|
| SELECT, COUNT | `sql-select` | `/sql/dml/query` |
| INSERT, UPDATE, DELETE | `sql-update` | `/sql/update` |

The library handles this automatically — `select()`, `selectOne()`, `count()` use the SELECT endpoint, while `delete()`, `update()` (with WHERE clause), and `truncate()` use the DML endpoint.

> **Tip:** Make sure your IP address is added to the GridDB Cloud allowlist, otherwise all requests will return `403 Forbidden`.

### GridDB Cloud Configuration

```typescript
const griddb = new GridDB({
  griddbWebApiUrl: 'https://cloud1.griddb.com/trial1234/griddb/v2/gs_clustertrial1234/dbs/public',
  username: 'your_username',
  password: 'your_password'
});
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# GridDB Web API Configuration
GRIDDB_WEBAPI_URL=http://localhost:8080/griddb/v2
GRIDDB_USERNAME=admin
GRIDDB_PASSWORD=admin

# Optional
GRIDDB_TIMEOUT=30000
GRIDDB_RETRY_ATTEMPTS=3
GRIDDB_RETRY_DELAY=1000
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please use the [GitHub Issues](https://github.com/junwatu/griddb-client/issues) page.
