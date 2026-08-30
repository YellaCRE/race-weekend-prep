import { env } from 'cloudflare:workers';
import { calendarSchema } from '@/db/schema';
import type { CalendarPayload, CalendarSession, Race } from '@/lib/calendar-sync';

const SEASON = 2026;
let initialized = false;

type RaceRow = {
  id: string;
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

type SessionRow = {
  race_id: string;
  session_name: CalendarSession['name'];
  starts_at: string;
  time_label: string;
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
    'SELECT id, series, date_label, race_day, name, circuit, country, race_time, accent, source_url, synced_at FROM calendar_races WHERE season = ? ORDER BY sort_order ASC',
  ).bind(SEASON).all<RaceRow>();
  const rows = result.results ?? [];
  if (rows.length === 0) return null;

  const sessionResult = await database.prepare(
    'SELECT race_id, session_name, starts_at, time_label FROM calendar_sessions WHERE season = ? ORDER BY starts_at ASC',
  ).bind(SEASON).all<SessionRow>();
  const sessionsByRace = new Map<string, CalendarSession[]>();
  for (const session of sessionResult.results ?? []) {
    const entries = sessionsByRace.get(session.race_id) ?? [];
    entries.push({ name: session.session_name, startsAt: session.starts_at, time: session.time_label });
    sessionsByRace.set(session.race_id, entries);
  }

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
    sessions: sessionsByRace.get(row.id) ?? [],
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

  const clearSessions = database.prepare('DELETE FROM calendar_sessions WHERE season = ?').bind(SEASON);
  const clearRaces = database.prepare('DELETE FROM calendar_races WHERE season = ?').bind(SEASON);
  const raceId = (index: number, race: Race) => race.series + '-' + SEASON + '-' + index;
  const entries = payload.races.map((race, index) => database.prepare(
    'INSERT INTO calendar_races (id, season, sort_order, series, date_label, race_day, name, circuit, country, race_time, accent, source_url, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(
    raceId(index, race),
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
  const sessionEntries = payload.races.flatMap((race, index) => (race.sessions ?? []).map((session) => database.prepare(
    'INSERT INTO calendar_sessions (race_id, season, session_name, starts_at, time_label) VALUES (?, ?, ?, ?, ?)',
  ).bind(raceId(index, race), SEASON, session.name, session.startsAt, session.time)));
  await database.batch([clearSessions, clearRaces, ...entries, ...sessionEntries]);
}

export function shouldRefreshCalendar(updatedAt: string): boolean {
  const annualRefresh = 1000 * 60 * 60 * 24 * 300;
  return Date.now() - new Date(updatedAt).getTime() > annualRefresh;
}
