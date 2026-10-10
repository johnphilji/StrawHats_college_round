import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../apps/server/data.json');

const initialData = {
  sites: [
    { id: 'acme', name: 'Acme Store', targetUrl: 'http://localhost:4000' }
  ],
  patches: [],
  releases: [],
  telemetry: [],
  audit: []
};

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
console.log('Database seeded with Acme Store and clean slate.');