export const GENERATIVE_AI_EXPORT_PATH = 'src/data/search/generative-ai-performance.csv';

export interface GenerativeAiMeasurement {
  impressions: number | 'unspecified';
  status: 'not_exported' | 'parsed';
  reason: string;
}

function splitCsvRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

/** Chart export from Search Console → Performance → Generative AI. Sums the impressions column. */
export function parseGenerativeAiChartCsv(csv: string): { impressions: number; rows: number } {
  const text = csv.replace(/^\uFEFF/, '').trim();
  if (!text) throw new Error('The Generative AI export was empty.');
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = splitCsvRow(lines[0]).map((cell) => cell.toLowerCase());
  const impressionIndex = header.findIndex((cell) => cell.includes('impression'));
  if (impressionIndex < 0) throw new Error('The Generative AI export has no impressions column.');
  let impressions = 0;
  let rows = 0;
  for (const line of lines.slice(1)) {
    const cells = splitCsvRow(line);
    if ((cells[0] || '').toLowerCase() === 'total') continue;
    const raw = (cells[impressionIndex] || '').replace(/,/g, '');
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error('An impressions cell was not a number.');
    impressions += value;
    rows += 1;
  }
  if (rows === 0) throw new Error('The Generative AI export had no data rows.');
  return { impressions, rows };
}

const NOT_EXPORTED: GenerativeAiMeasurement = {
  impressions: 'unspecified',
  status: 'not_exported',
  reason: 'The Generative AI performance report is exported from Search Console in the browser. The Search Analytics API has no generative AI type, and no chart CSV is stored in this repository.',
};

/** Sums a chart export. Pass no text when the file has not been saved. This module does not read the disk. */
export function generativeAiImpressions(csv?: string | null): GenerativeAiMeasurement {
  if (csv == null || csv.trim() === '') return NOT_EXPORTED;
  const parsed = parseGenerativeAiChartCsv(csv);
  return {
    impressions: parsed.impressions,
    status: 'parsed',
    reason: `Summed ${parsed.rows} rows from the Search Console Generative AI chart export.`,
  };
}
