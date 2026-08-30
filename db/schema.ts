export const calendarSchema = [
  `CREATE TABLE IF NOT EXISTS calendar_races (
    id TEXT PRIMARY KEY,
    season INTEGER NOT NULL,
    sort_order INTEGER NOT NULL,
    series TEXT NOT NULL,
    date_label TEXT NOT NULL,
    race_day TEXT NOT NULL,
    name TEXT NOT NULL,
    circuit TEXT NOT NULL,
    country TEXT NOT NULL,
    race_time TEXT NOT NULL,
    accent TEXT NOT NULL,
    source_url TEXT NOT NULL,
    synced_at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_calendar_races_season_sort_order ON calendar_races(season, sort_order)',
  `CREATE TABLE IF NOT EXISTS calendar_sessions (
    race_id TEXT NOT NULL,
    season INTEGER NOT NULL,
    session_name TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    time_label TEXT NOT NULL,
    PRIMARY KEY (race_id, session_name)
  )`,
  'CREATE INDEX IF NOT EXISTS idx_calendar_sessions_season_race_id ON calendar_sessions(season, race_id)',
];
