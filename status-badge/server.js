import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createHandlers } from './lib/handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATUS_FILE_PATH = path.join(__dirname, 'status.json');
const PORT = process.env.PORT || 3000;

function readStatusData() {
  try {
    const raw = fs.readFileSync(STATUS_FILE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const handlers = createHandlers({ getStatusData: readStatusData });

export const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const response = handlers.route(req.method, pathname);

  if (!response) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  res.writeHead(response.statusCode, response.headers);
  res.end(response.body);
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => {
    console.log(`status-badge server listening on port ${PORT}`);
  });
}
