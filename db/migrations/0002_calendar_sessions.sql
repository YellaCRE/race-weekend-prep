CREATE TABLE IF NOT EXISTS calendar_sessions (
  race_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  session_name TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  time_label TEXT NOT NULL,
  PRIMARY KEY (race_id, session_name)
);

CREATE INDEX IF NOT EXISTS idx_calendar_sessions_season_race_id
ON calendar_sessions(season, race_id);
