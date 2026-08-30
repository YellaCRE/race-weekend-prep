import { env } from 'cloudflare:workers';
import { calendarSchema } from '@/db/schema';
import type { CalendarPayload, Race } from '@/lib/calendar-sync';

const SEASON = 2026;
let initialized = false;

type RaceRow = {
  series: Race['series'];
  date_label: string;
  race_day: string;
  name: string;
  circuit: string;
  country: string;
  race_time: string;
  accent: Race['accent'];
  source_url: string;
  synced_at: string;
};

async function getDatabase() {
  const database = env.DB as D1Database | undefined;
  if (!database) return null;

  if (!initialized) {
    await database.batch(calendarSchema.map((statement) => database.prepare(statement)));
    initialized = true;
  }

  return database;
}

export async function readStoredCalendar(): Promise<CalendarPayload | null> {
  const database = await getDatabase();
  if (!database) return null;

  const result = await database.prepare(
    'SELECT series, date_label, race_day, name, circuit, country, race_time, accent, source_url, synced_at FROM calendar_races WHERE season = ? ORDER BY sort_order ASC',
  ).bind(SEASON).all<RaceRow>();
  const rows = result.results ?? [];
  if (rows.length === 0) return null;

  const races: Race[] = rows.map((row) => ({
    series: row.series,
    date: row.date_label,
    day: row.race_day,
    name: row.name,
    circuit: row.circuit,
    country: row.country,
    time: row.race_time,
    accent: row.accent,
    sourceUrl: row.source_url,
  }));
  const latestSync = rows.reduce((latest, row) => row.synced_at > latest ? row.synced_at : latest, rows[0].synced_at);
  const f1 = rows.find((row) => row.series === 'F1')?.source_url ?? '';
  const wec = rows.find((row) => row.series === 'WEC')?.source_url ?? '';

  return { races, updatedAt: latestSync, sources: { F1: f1, WEC: wec }, mode: 'official-sync' };
}

export async function saveCalendar(payload: CalendarPayload): Promise<void> {
  if (payload.mode !== 'official-sync') return;
  const database = await getDatabase();
  if (!database) return;

  const clear = database.prepare('DELETE FROM calendar_races WHERE season = ?').bind(SEASON);
  const entries = payload.races.map((race, index) => database.prepare(
    'INSERT INTO calendar_races (id, season, sort_order, series, date_label, race_day, name, circuit, country, race_time, accent, source_url, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(
    race.series + '-' + SEASON + '-' + index,
    SEASON,
    index,
    race.series,
    race.date,
    race.day,
    race.name,
    race.circuit,
    race.country,
    race.time,
    race.accent,
    race.sourceUrl,
    payload.updatedAt,
  ));
  await database.batch([clear, ...entries]);
}

export function shouldRefreshCalendar(updatedAt: string): boolean {
  const annualRefresh = 1000 * 60 * 60 * 24 * 300;
  return Date.now() - new Date(updatedAt).getTime() > annualRefresh;
}
