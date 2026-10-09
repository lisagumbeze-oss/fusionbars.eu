import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { GENERATIVE_AI_EXPORT_PATH, generativeAiImpressions } from '@/domain/search/generative-ai-report';

/** Server-side read of the Search Console chart export. Do not import this from a client component. */
export function loadGenerativeAiImpressions(csvPath = path.resolve(GENERATIVE_AI_EXPORT_PATH)) {
  if (!existsSync(csvPath)) return generativeAiImpressions(null);
  return generativeAiImpressions(readFileSync(csvPath, 'utf8'));
}
