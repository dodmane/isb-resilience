import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

process.env.AURORA_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'aurora-test-'));
process.env.AURORA_STORAGE_BACKEND = 'json';