/**
 * Express CRUD Server for GridDB - AI Diagnosis Logs
 */

import express, { Request, Response } from 'express';
import { GridDB, IdGeneratorFactory } from '../src';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const CONTAINER_NAME = 'ai_diagnosis_logs';

const griddb = new GridDB({
  griddbWebApiUrl: process.env.GRIDDB_WEBAPI_URL || 'http://localhost:8080/griddb/v2',
  username: process.env.GRIDDB_USERNAME || 'admin',
  password: process.env.GRIDDB_PASSWORD || 'admin'
});

// Initialize container
async function initContainer() {
  await griddb.createContainer({
    containerName: CONTAINER_NAME,
    containerType: 'COLLECTION',
    rowkey: true,
    ifNotExists: true,
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'logs', type: 'BLOB' },
      { name: 'diagnosis', type: 'STRING' },
      { name: 'timestamp', type: 'TIMESTAMP' },
      { name: 'aimodel', type: 'STRING' }
    ]
  });
  console.log(`✓ Container "${CONTAINER_NAME}" ready`);
}

// CREATE - Insert a new diagnosis log
app.post('/api/logs', async (req: Request, res: Response) => {
  try {
    const { logs, diagnosis, aimodel } = req.body;

    if (!diagnosis || !aimodel) {
      res.status(400).json({ error: 'diagnosis and aimodel are required' });
      return;
    }

    const record = {
      id: IdGeneratorFactory.random(1, 1000000),
      logs: logs ? Buffer.from(logs).toString('base64') : null,
      diagnosis,
      timestamp: new Date().toISOString(),
      aimodel
    };

    await griddb.insert({
      containerName: CONTAINER_NAME,
      data: record
    });

    res.status(201).json({ message: 'Log created', data: record });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ error: 'Failed to create log' });
  }
});

// READ ALL - Get all diagnosis logs
app.get('/api/logs', async (req: Request, res: Response) => {
  try {
    const { limit, offset, orderBy, order } = req.query;

    const logs = await griddb.select({
      containerName: CONTAINER_NAME,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      orderBy: (orderBy as string) || 'timestamp',
      order: (order as 'ASC' | 'DESC') || 'DESC'
    });

    const count = await griddb.count(CONTAINER_NAME);

    res.json({ total: count, data: logs });
  } catch (error) {
    console.error('Read error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// READ ONE - Get a single diagnosis log by ID
app.get('/api/logs/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    const log = await griddb.selectOne({
      containerName: CONTAINER_NAME,
      where: 'id = ?',
      bindings: [id]
    });

    if (!log) {
      res.status(404).json({ error: 'Log not found' });
      return;
    }

    res.json({ data: log });
  } catch (error) {
    console.error('Read error:', error);
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

// UPDATE - Update a diagnosis log by ID
app.put('/api/logs/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { logs, diagnosis, aimodel } = req.body;

    const existing = await griddb.selectOne({
      containerName: CONTAINER_NAME,
      where: 'id = ?',
      bindings: [id]
    });

    if (!existing) {
      res.status(404).json({ error: 'Log not found' });
      return;
    }

    const updated = {
      ...existing,
      logs: logs !== undefined ? Buffer.from(logs).toString('base64') : existing.logs,
      diagnosis: diagnosis || existing.diagnosis,
      aimodel: aimodel || existing.aimodel
    };

    await griddb.update({
      containerName: CONTAINER_NAME,
      data: updated,
      where: 'id = ?',
      bindings: [id]
    });

    res.json({ message: 'Log updated', data: updated });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update log' });
  }
});

// DELETE - Delete a diagnosis log by ID
app.delete('/api/logs/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    const existing = await griddb.exists(CONTAINER_NAME, 'id = ?', [id]);

    if (!existing) {
      res.status(404).json({ error: 'Log not found' });
      return;
    }

    await griddb.delete({
      containerName: CONTAINER_NAME,
      where: 'id = ?',
      bindings: [id]
    });

    res.json({ message: 'Log deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete log' });
  }
});

// SEARCH - Search logs by AI model or diagnosis
app.get('/api/logs/search/:field', async (req: Request, res: Response) => {
  try {
    const { field } = req.params;
    const { q } = req.query;

    if (!q) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const allowedFields = ['aimodel', 'diagnosis'];
    if (!allowedFields.includes(field)) {
      res.status(400).json({ error: `Field must be one of: ${allowedFields.join(', ')}` });
      return;
    }

    const results = await griddb.select({
      containerName: CONTAINER_NAME,
      where: `${field} = ?`,
      bindings: [q as string]
    });

    res.json({ total: results.length, data: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search logs' });
  }
});

// COUNT - Get total log count
app.get('/api/logs-count', async (_req: Request, res: Response) => {
  try {
    const count = await griddb.count(CONTAINER_NAME);
    res.json({ total: count });
  } catch (error) {
    console.error('Count error:', error);
    res.status(500).json({ error: 'Failed to count logs' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

initContainer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log('\nAPI Endpoints:');
      console.log('  POST   /api/logs          - Create a log');
      console.log('  GET    /api/logs          - Get all logs');
      console.log('  GET    /api/logs/:id      - Get log by ID');
      console.log('  PUT    /api/logs/:id      - Update log by ID');
      console.log('  DELETE /api/logs/:id      - Delete log by ID');
      console.log('  GET    /api/logs/search/:field?q=value - Search logs');
      console.log('  GET    /api/logs-count    - Get total count');
    });
  })
  .catch((err) => {
    console.error('Failed to initialize:', err);
    process.exit(1);
  });
