import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Site, Patch, Release, AuditEntry, TelemetryEvent } from '@patchwork/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data.json');

export interface Schema {
  sites: Site[];
  patches: Patch[];
  releases: Release[];
  telemetry: TelemetryEvent[];
  audit: AuditEntry[];
}

export const defaultData: Schema = {
  sites: [],
  patches: [],
  releases: [],
  telemetry: [],
  audit: []
};

export function readDb(): Schema {
  if (!fs.existsSync(DB_PATH)) return defaultData;
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return defaultData;
  }
}

export function writeDb(data: Schema) {
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_PATH);
}
