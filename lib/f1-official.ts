const YEAR = 2026;
const F1_ORIGIN = 'https://www.formula1.com';

export type F1Circuit = {
  name: string;
  imageUrl?: string;
  facts: Array<{ label: string; value: string; detail?: string }>;
  sourceUrl: string;
};

export type F1Results = {
  headers: string[];
  rows: string[][];
  sourceUrl: string;
};

export type F1OfficialRace = {
  circuit?: F1Circuit;
  results?: F1Results;
};

const clean = (value: string) => decode(value
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim());

function decode(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function firstMatch(html: string, expression: RegExp) {
  return expression.exec(html)?.[1];
}

function parseCircuit(html: string, sourceUrl: string): F1Circuit | undefined {
  const circuitStart = html.indexOf('>Circuit<');
  if (circuitStart < 0) return undefined;
  const section = html.slice(circuitStart, circuitStart + 14000);
  const facts = [...section.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>(?:\s*<span[^>]*>([\s\S]*?)<\/span>)?/gi)]
    .map((match) => ({ label: clean(match[1]), value: clean(match[2]), detail: clean(match[3] ?? '') || undefined }))
    .filter((fact) => fact.label && fact.value);
  const imageUrl = firstMatch(section, /<img[^>]+src="([^"]+)"[^>]+alt="[^"]*(?:track|Track)[^"]*"/i)
    ?? firstMatch(section, /<img[^>]+src="([^"]+)"/i);
  const name = firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? 'Circuit';
  return facts.length > 0 ? { name: clean(name), imageUrl, facts, sourceUrl } : undefined;
}

function parseResults(html: string, sourceUrl: string): F1Results | undefined {
  const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)].map((match) => match[1]);
  const table = tables.sort((left, right) => (right.match(/<tr/gi)?.length ?? 0) - (left.match(/<tr/gi)?.length ?? 0))[0];
  if (!table) return undefined;
  const headers = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((match) => clean(match[1])).filter(Boolean);
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => clean(cell[1])).filter(Boolean))
    .filter((row) => row.length > 0);
  return headers.length > 0 && rows.length > 0 ? { headers, rows, sourceUrl } : undefined;
}

function resultPageUrl(meetingId: string, slug: string) {
  return F1_ORIGIN + '/en/results/' + YEAR + '/races/' + meetingId + '/' + slug + '/race-result';
}

async function getResults(slug: string) {
  const indexUrl = F1_ORIGIN + '/en/results/' + YEAR + '/races';
  const indexHtml = await (await fetch(indexUrl)).text();
  const normalizedIndex = indexHtml.replace(/\\"/g, '"');
  const raceName = slug.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ');
  const meetingId = firstMatch(normalizedIndex, new RegExp('"value":(\\d+),"text":"' + raceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'i'));
  if (!meetingId) return undefined;
  const sourceUrl = resultPageUrl(meetingId, slug);
  return parseResults(await (await fetch(sourceUrl)).text(), sourceUrl);
}

const cached = new Map<string, { expires: number; value: F1OfficialRace }>();

export async function getF1OfficialRace(slug: string): Promise<F1OfficialRace> {
  const cache = cached.get(slug);
  if (cache && cache.expires > Date.now()) return cache.value;

  const sourceUrl = F1_ORIGIN + '/en/racing/' + YEAR + '/' + slug;
  const [circuitResult, resultsResult] = await Promise.allSettled([
    fetch(sourceUrl).then(async (response) => parseCircuit(await response.text(), sourceUrl)),
    getResults(slug),
  ]);
  const value: F1OfficialRace = {
    circuit: circuitResult.status === 'fulfilled' ? circuitResult.value : undefined,
    results: resultsResult.status === 'fulfilled' ? resultsResult.value : undefined,
  };
  cached.set(slug, { value, expires: Date.now() + 1000 * 60 * 15 });
  return value;
}
