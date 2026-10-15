import { existsSync, readFileSync } from 'node:fs';
import { referenceFor, topicFor } from './presentation.mjs';

const artifact = new URL('../../src/data/api-reference.json', import.meta.url);
export function apiReferenceTopics() {
  if (!existsSync(artifact)) return [];
  const data = JSON.parse(readFileSync(artifact, 'utf8'));
  return [topicFor(referenceFor(data))];
}
