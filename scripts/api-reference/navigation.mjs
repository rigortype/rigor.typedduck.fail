import { existsSync, readFileSync } from 'node:fs';
import { parseExport } from './model.mjs';
import { topic } from './routes.mjs';

const artifact = new URL('../../src/data/api-reference.json', import.meta.url);
export function apiReferenceTopics() {
  if (!existsSync(artifact)) return [];
  const data = JSON.parse(readFileSync(artifact, 'utf8'));
  return [topic(parseExport(data.export))];
}
