export type CalendarSession = {
  name: 'Practice 1' | 'Practice 2' | 'Practice 3' | 'Sprint Qualifying' | 'Sprint' | 'Qualifying' | 'Race';
  startsAt: string;
  time: string;
};

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
  sessions?: CalendarSession[];
};

export type CalendarPayload = {
  races: Race[];
  updatedAt: string;
  sources: { F1: string; WEC: string };
  mode: 'official-sync' | 'fallback';
};

const YEAR = 2026;
const F1_SOURCE = 'https://www.formula1.com/en/racing/' + YEAR;
const WEC_SOURCE = 'https://www.fiawec.com/en/season/' + YEAR;
const fallback: Race[] = [
  { series: 'F1', date: 'SEP 04–06', day: '06', name: 'Italian Grand Prix', circuit: 'Monza', country: 'Italy', time: 'TBA', accent: 'red', sourceUrl: F1_SOURCE },
  { series: 'WEC', date: 'SEP 25–27', day: '27', name: '6 Hours of Fuji', circuit: 'Fuji Speedway', country: 'Japan', time: 'TBA', accent: 'gold', sourceUrl: WEC_SOURCE },
  { series: 'F1', date: 'SEP 11–13', day: '13', name: 'Spanish Grand Prix', circuit: 'Madrid', country: 'Spain', time: 'TBA', accent: 'red', sourceUrl: F1_SOURCE },
  { series: 'F1', date: 'SEP 24–26', day: '26', name: 'Azerbaijan Grand Prix', circuit: 'Baku City Circuit', country: 'Azerbaijan', time: 'TBA', accent: 'red', sourceUrl: F1_SOURCE },
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

const f1CircuitByScheduleSlug: Record<string, string> = {
  australia: 'Albert Park', china: 'Shanghai', japan: 'Suzuka', miami: 'Miami International Autodrome', canada: 'Circuit Gilles-Villeneuve',
  monaco: 'Monaco', 'barcelona-catalunya': 'Circuit de Barcelona-Catalunya', austria: 'Spielberg', 'great-britain': 'Silverstone',
  belgium: 'Spa-Francorchamps', hungary: 'Hungaroring', netherlands: 'Zandvoort', italy: 'Monza', spain: 'Madrid',
  azerbaijan: 'Baku City Circuit', bahrain: 'Sakhir', singapore: 'Marina Bay', 'united-states': 'Circuit of the Americas',
  mexico: 'Autódromo Hermanos Rodríguez', brazil: 'Interlagos', 'las-vegas': 'Las Vegas Strip Circuit', qatar: 'Lusail', 'abu-dhabi': 'Yas Marina',
};

const f1TimezoneByScheduleSlug: Record<string, string> = {
  australia: 'Australia/Melbourne', china: 'Asia/Shanghai', japan: 'Asia/Tokyo', miami: 'America/New_York', canada: 'America/Toronto',
  monaco: 'Europe/Monaco', 'barcelona-catalunya': 'Europe/Madrid', austria: 'Europe/Vienna', 'great-britain': 'Europe/London',
  belgium: 'Europe/Brussels', hungary: 'Europe/Budapest', netherlands: 'Europe/Amsterdam', italy: 'Europe/Rome', spain: 'Europe/Madrid',
  azerbaijan: 'Asia/Baku', bahrain: 'Asia/Bahrain', singapore: 'Asia/Singapore', 'united-states': 'America/Chicago',
  mexico: 'America/Mexico_City', brazil: 'America/Sao_Paulo', 'las-vegas': 'America/Los_Angeles', qatar: 'Asia/Qatar', 'abu-dhabi': 'Asia/Dubai',
};

const months: Record<string, string> = { jan: 'JAN', feb: 'FEB', mar: 'MAR', apr: 'APR', may: 'MAY', jun: 'JUN', jul: 'JUL', aug: 'AUG', sep: 'SEP', oct: 'OCT', nov: 'NOV', dec: 'DEC' };
const clean = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const titleFromSlug = (slug: string) => slug.replace(/-\d{4}$/, '').split('-').map((word) => word === 'of' ? word : word[0].toUpperCase() + word.slice(1)).join(' ');

type F1ScheduleRace = Race & { scheduleUrl: string; scheduleSlug: string };

function parseF1(html: string): F1ScheduleRace[] {
  const eventPattern = new RegExp('href=["\\\'](?:https?:\\/\\/www\\.formula1\\.com)?\\/en\\/racing\\/' + YEAR + '\\/([^"\\\/?#]+)[^"\\\']*["\\\']', 'gi');
  const matches = [...html.matchAll(eventPattern)];
  const seen = new Set<string>();

  return matches.flatMap((match, index) => {
    const slug = match[1].toLowerCase();
    if (seen.has(slug) || slug === String(YEAR)) return [];
    const section = html.slice(match.index, matches[index + 1]?.index ?? match.index + 2600);
    const text = clean(section);
    const date = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i);
    if (!date) return [];
    const month = months[date[3].toLowerCase()];
    if (!month) return [];

    seen.add(slug);
    const country = titleFromSlug(slug);
    const finalDay = date[2].padStart(2, '0');
    return [{
      series: 'F1',
      date: month + ' ' + date[1].padStart(2, '0') + '–' + finalDay,
      day: finalDay,
      name: country + ' Grand Prix',
      circuit: f1CircuitByScheduleSlug[slug] ?? country,
      country,
      time: 'TBA',
      accent: 'red',
      sourceUrl: F1_SOURCE + '/' + slug,
      scheduleUrl: F1_SOURCE + '/' + slug,
      scheduleSlug: slug,
    }];
  });
}

function getTimeParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
}

function localTimeToKst(year: number, month: number, day: number, hour: number, minute: number, timezone: string) {
  const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);
  let instant = wanted;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = getTimeParts(new Date(instant), timezone);
    const displayed = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    instant += wanted - displayed;
  }
  const kst = getTimeParts(new Date(instant), 'Asia/Seoul');
  return {
    startsAt: String(kst.year).padStart(4, '0') + '-' + String(kst.month).padStart(2, '0') + '-' + String(kst.day).padStart(2, '0') + 'T' + String(kst.hour).padStart(2, '0') + ':' + String(kst.minute).padStart(2, '0') + ':00+09:00',
    time: String(kst.hour).padStart(2, '0') + ':' + String(kst.minute).padStart(2, '0'),
  };
}

function instantToKst(startsAt: string) {
  const kst = getTimeParts(new Date(startsAt), 'Asia/Seoul');
  return {
    startsAt: String(kst.year).padStart(4, '0') + '-' + String(kst.month).padStart(2, '0') + '-' + String(kst.day).padStart(2, '0') + 'T' + String(kst.hour).padStart(2, '0') + ':' + String(kst.minute).padStart(2, '0') + ':00+09:00',
    time: String(kst.hour).padStart(2, '0') + ':' + String(kst.minute).padStart(2, '0'),
  };
}

function parseF1Sessions(html: string, timezone: string): CalendarSession[] {
  const names = new Set<CalendarSession['name']>();
  const structuredSchedule = html.replace(/\\"/g, '"');
  const structuredPattern = /"description":"(Practice\s+[123]|Sprint\s+Qualifying|Sprint|Qualifying|Race)","startTime":"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})","endTime":"[^"]*","gmtOffset":"([+-]\d{2}:\d{2})"/gi;
  const structuredSessions = [...structuredSchedule.matchAll(structuredPattern)].flatMap((match) => {
    const name = match[1].replace(/\s+/g, ' ') as CalendarSession['name'];
    if (names.has(name)) return [];
    names.add(name);
    return [{ name, ...instantToKst(match[2] + match[3]) }];
  });
  if (structuredSessions.length > 0) return structuredSessions;

  const text = clean(html);
  const pattern = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(Practice\s+[123]|Sprint\s+Qualifying|Sprint|Qualifying|Race)\s+(\d{1,2}):(\d{2})\b/gi;
  return [...text.matchAll(pattern)].flatMap((match) => {
    const name = match[3].replace(/\s+/g, ' ') as CalendarSession['name'];
    const month = Object.keys(months).indexOf(match[2].toLowerCase()) + 1;
    if (!month || names.has(name)) return [];
    names.add(name);
    const kst = localTimeToKst(YEAR, month, Number(match[1]), Number(match[4]), Number(match[5]), timezone);
    return [{ name, ...kst }];
  });
}

async function addF1SessionTimes(races: F1ScheduleRace[]): Promise<Race[]> {
  const results = await Promise.all(races.map(async (race) => {
    const timezone = f1TimezoneByScheduleSlug[race.scheduleSlug];
    if (!timezone) return race;
    try {
      const response = await fetch(race.scheduleUrl);
      if (!response.ok) return race;
      const sessions = parseF1Sessions(await response.text(), timezone);
      const raceSession = sessions.find((session) => session.name === 'Race');
      return sessions.length > 0 ? { ...race, sessions, time: raceSession?.time ?? race.time } : race;
    } catch {
      return race;
    }
  }));
  return results.map(({ scheduleUrl: _scheduleUrl, scheduleSlug: _scheduleSlug, ...race }) => race);
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
    const f1Races = await addF1SessionTimes(parseF1(f1Html));
    const races = [...f1Races, ...parseWec(wecHtml)];
    const value: CalendarPayload = { races: races.length >= 8 ? races : fallback, updatedAt: new Date().toISOString(), sources: { F1: F1_SOURCE, WEC: WEC_SOURCE }, mode: races.length >= 8 ? 'official-sync' : 'fallback' };
    cached = { value, expires: Date.now() + 1000 * 60 * 60 * 24 };
    return value;
  } catch {
    return { races: fallback, updatedAt: new Date().toISOString(), sources: { F1: F1_SOURCE, WEC: WEC_SOURCE }, mode: 'fallback' };
  }
}
