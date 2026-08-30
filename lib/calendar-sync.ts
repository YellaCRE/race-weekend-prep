export type Race = {
  series: 'F1' | 'WEC';
  date: string;
  day: string;
  name: string;
  circuit: string;
  country: string;
  time: string;
  accent: 'red' | 'gold';
  sourceUrl: string;
};

export type CalendarPayload = {
  races: Race[];
  updatedAt: string;
  sources: { F1: string; WEC: string };
  mode: 'official-sync' | 'fallback';
};

const YEAR = 2026;
const F1_SOURCE = 'https://www.formula1.com/en/latest/article/formula-1-reveals-calendar-for-2026-season.YctbMZWqBvrgyddrnauo8';
const WEC_SOURCE = 'https://www.fiawec.com/en/season/' + YEAR;
const fallback: Race[] = [
  { series: 'F1', date: 'SEP 04–06', day: '06', name: 'Italian Grand Prix', circuit: 'Monza', country: 'Italy', time: '22:00', accent: 'red', sourceUrl: F1_SOURCE },
  { series: 'WEC', date: 'SEP 25–27', day: '27', name: '6 Hours of Fuji', circuit: 'Fuji Speedway', country: 'Japan', time: '11:00', accent: 'gold', sourceUrl: WEC_SOURCE },
  { series: 'F1', date: 'SEP 11–13', day: '13', name: 'Spanish Grand Prix', circuit: 'Madrid', country: 'Spain', time: '22:00', accent: 'red', sourceUrl: F1_SOURCE },
  { series: 'F1', date: 'SEP 24–26', day: '26', name: 'Azerbaijan Grand Prix', circuit: 'Baku City Circuit', country: 'Azerbaijan', time: '20:00', accent: 'red', sourceUrl: F1_SOURCE },
];

const circuits: Record<string, string> = {
  'australian-grand-prix': 'Albert Park', 'chinese-grand-prix': 'Shanghai', 'japanese-grand-prix': 'Suzuka', 'bahrain-grand-prix': 'Sakhir',
  'saudi-arabian-grand-prix': 'Jeddah', 'miami-grand-prix': 'Miami International Autodrome', 'canadian-grand-prix': 'Circuit Gilles-Villeneuve',
  'monaco-grand-prix': 'Monaco', 'spanish-grand-prix': 'Madrid', 'austrian-grand-prix': 'Spielberg', 'british-grand-prix': 'Silverstone',
  'belgian-grand-prix': 'Spa-Francorchamps', 'hungarian-grand-prix': 'Hungaroring', 'dutch-grand-prix': 'Zandvoort', 'italian-grand-prix': 'Monza',
  'azerbaijan-grand-prix': 'Baku City Circuit', 'singapore-grand-prix': 'Marina Bay', 'united-states-grand-prix': 'Circuit of the Americas',
  'mexico-city-grand-prix': 'Autódromo Hermanos Rodríguez', 'brazilian-grand-prix': 'Interlagos', 'las-vegas-grand-prix': 'Las Vegas Strip Circuit',
  'qatar-grand-prix': 'Lusail', 'abu-dhabi-grand-prix': 'Yas Marina', '6-hours-of-imola': 'Imola',
  'totalenergies-6-hours-of-spa-francorchamps': 'Spa-Francorchamps', '24-hours-of-le-mans': 'Circuit de la Sarthe',
  'rolex-6-hours-of-sao-paulo': 'Interlagos', 'lone-star-le-mans': 'Circuit of the Americas', '6-hours-of-fuji': 'Fuji Speedway',
  '6-hours-of-barcelona': 'Circuit de Barcelona-Catalunya', '6-hours-of-monza': 'Monza',
};

const months: Record<string, string> = { jan: 'JAN', feb: 'FEB', mar: 'MAR', apr: 'APR', may: 'MAY', jun: 'JUN', jul: 'JUL', aug: 'AUG', sep: 'SEP', oct: 'OCT', nov: 'NOV', dec: 'DEC' };
const clean = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const titleFromSlug = (slug: string) => slug.replace(/-\d{4}$/, '').split('-').map((word) => word === 'of' ? word : word[0].toUpperCase() + word.slice(1)).join(' ');

function parseF1(html: string): Race[] {
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0] ?? '';
  return [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].flatMap((row) => {
    const cells = [...row[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => clean(cell[1]));
    if (cells.length < 3 || !/Grand Prix/i.test(cells.join(' '))) return [];
    const match = cells[0].match(/([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2})/);
    if (!match) return [];
    const month = months[match[1].slice(0, 3).toLowerCase()];
    const day = match[3].padStart(2, '0');
    const country = cells[1];
    const slug = country.toLowerCase().replace(/[^a-z]+/g, '-') + '-grand-prix';
    return [{ series: 'F1', date: month + ' ' + match[2].padStart(2, '0') + '–' + day, day, name: (country === 'USA' ? 'United States' : country) + ' Grand Prix', circuit: circuits[slug] ?? cells[2].replace(/\s*\(.*\)/, ''), country, time: 'TBA', accent: 'red', sourceUrl: F1_SOURCE }];
  });
}

function parseWec(html: string): Race[] {
  const pattern = /href="\/en\/race\/([^"]+-2026)"[\s\S]{0,950}?flag:([A-Z]{2})[\s\S]{0,900}?<strong[^>]*>\s*(\d{1,2})\s*<\/strong>[\s\S]{0,200}?<small[^>]*>\s*([A-Za-z]{3})/gi;
  const seen = new Set<string>();
  return [...html.matchAll(pattern)].flatMap((match) => {
    const slug = match[1].replace(/-2026$/, '');
    if (slug.includes('prologue') || seen.has(slug)) return [];
    seen.add(slug);
    const month = months[match[4].toLowerCase()];
    if (!month) return [];
    const day = match[3].padStart(2, '0');
    return [{ series: 'WEC', date: month + ' ' + day, day, name: titleFromSlug(slug), circuit: circuits[slug] ?? titleFromSlug(slug), country: match[2], time: 'TBA', accent: 'gold', sourceUrl: WEC_SOURCE }];
  });
}

let cached: { expires: number; value: CalendarPayload } | undefined;

export async function getOfficialCalendar(force = false): Promise<CalendarPayload> {
  if (!force && cached && cached.expires > Date.now()) return cached.value;
  try {
    const [f1Response, wecResponse] = await Promise.all([fetch(F1_SOURCE), fetch(WEC_SOURCE)]);
    const [f1Html, wecHtml] = await Promise.all([f1Response.text(), wecResponse.text()]);
    const races = [...parseF1(f1Html), ...parseWec(wecHtml)];
    const value: CalendarPayload = { races: races.length >= 8 ? races : fallback, updatedAt: new Date().toISOString(), sources: { F1: F1_SOURCE, WEC: WEC_SOURCE }, mode: races.length >= 8 ? 'official-sync' : 'fallback' };
    cached = { value, expires: Date.now() + 1000 * 60 * 60 * 24 };
    return value;
  } catch {
    return { races: fallback, updatedAt: new Date().toISOString(), sources: { F1: F1_SOURCE, WEC: WEC_SOURCE }, mode: 'fallback' };
  }
}
