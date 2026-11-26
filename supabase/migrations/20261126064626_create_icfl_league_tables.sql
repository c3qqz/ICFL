/*
# Create ICFL league tables

1. New Tables
- `teams`: NFL-branded Roblox league teams. Holds team name, abbreviation, emoji, logo URL, conference/division, plus win/loss/tie/points totals. One row per team.
- `games`: Weekly schedule/scoreboard entries. Season + week + team refs + scores. NULL scores show as "N/A" until an admin updates them.
- `player_stats`: Per-player stat lines for the stats leaderboard (passing, rushing, receiving, defense). Updated manually by admin or via CSV/Roblox webhook import.
- `playoff_slots`: Editable playoff bracket. Each slot has a round (Wildcard, Divisional, Championship, Super Bowl), position, and the two team refs + scores.
- `app_settings`: Key/value settings. Stores league admin auth code, Discord webhook URLs (stats sync), and site settings.
- `webhook_log`: History of every webhook payload the site received (Roblox ultimate football JSON, Discord syncs) for auditing.

2. Security
- RLS enabled on every table. This site has no sign-in screen: the public reads league data, and admin actions are gated in the app by an admin code stored in app_settings.
- Public read access for everyone (standings, schedule, stats, bracket are public-facing), writes granted to anon + authenticated since there is no sign-in. Admin gating happens in the UI (admin code entry), which keeps the site simple for a Roblox league.
- Explicit GRANTs for anon + authenticated on all tables so the Data API works.
- Service role granted access for any future edge function use.
*/

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  abbreviation text NOT NULL,
  emoji text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  conference text NOT NULL DEFAULT 'AFC',
  division text NOT NULL DEFAULT '',
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  ties integer NOT NULL DEFAULT 0,
  points_for integer NOT NULL DEFAULT 0,
  points_against integer NOT NULL DEFAULT 0,
  streak text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season integer NOT NULL DEFAULT 1,
  week integer NOT NULL DEFAULT 1,
  home_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  away_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  home_score integer,
  away_score integer,
  status text NOT NULL DEFAULT 'scheduled',
  game_time text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  team_name text NOT NULL DEFAULT '',
  position text NOT NULL DEFAULT '',
  games_played integer NOT NULL DEFAULT 0,
  passing_yards integer NOT NULL DEFAULT 0,
  passing_tds integer NOT NULL DEFAULT 0,
  interceptions integer NOT NULL DEFAULT 0,
  rushing_yards integer NOT NULL DEFAULT 0,
  rushing_tds integer NOT NULL DEFAULT 0,
  receptions integer NOT NULL DEFAULT 0,
  receiving_yards integer NOT NULL DEFAULT 0,
  receiving_tds integer NOT NULL DEFAULT 0,
  tackles integer NOT NULL DEFAULT 0,
  sacks integer NOT NULL DEFAULT 0,
  picks integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playoff_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round text NOT NULL,
  slot_index integer NOT NULL,
  team1_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  team2_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  team1_score integer,
  team2_score integer,
  winner_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  UNIQUE (round, slot_index)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_week ON games (season, week);
CREATE INDEX IF NOT EXISTS idx_stats_player ON player_stats (player_name);
CREATE INDEX IF NOT EXISTS idx_slots_round ON playoff_slots (round, slot_index);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON teams, games, player_stats, playoff_slots, app_settings, webhook_log TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON teams, games, player_stats, playoff_slots, app_settings, webhook_log TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON teams, games, player_stats, playoff_slots, app_settings, webhook_log TO service_role;

DROP POLICY IF EXISTS "public read teams" ON teams;
CREATE POLICY "public read teams" ON teams FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public write teams" ON teams;
CREATE POLICY "public write teams" ON teams FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public update teams" ON teams;
CREATE POLICY "public update teams" ON teams FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public delete teams" ON teams;
CREATE POLICY "public delete teams" ON teams FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read games" ON games;
CREATE POLICY "public read games" ON games FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public write games" ON games;
CREATE POLICY "public write games" ON games FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public update games" ON games;
CREATE POLICY "public update games" ON games FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public delete games" ON games;
CREATE POLICY "public delete games" ON games FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read player_stats" ON player_stats;
CREATE POLICY "public read player_stats" ON player_stats FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public write player_stats" ON player_stats;
CREATE POLICY "public write player_stats" ON player_stats FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public update player_stats" ON player_stats;
CREATE POLICY "public update player_stats" ON player_stats FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public delete player_stats" ON player_stats;
CREATE POLICY "public delete player_stats" ON player_stats FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read playoff_slots" ON playoff_slots;
CREATE POLICY "public read playoff_slots" ON playoff_slots FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public write playoff_slots" ON playoff_slots;
CREATE POLICY "public write playoff_slots" ON playoff_slots FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public update playoff_slots" ON playoff_slots;
CREATE POLICY "public update playoff_slots" ON playoff_slots FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public delete playoff_slots" ON playoff_slots;
CREATE POLICY "public delete playoff_slots" ON playoff_slots FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read app_settings" ON app_settings;
CREATE POLICY "public read app_settings" ON app_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public write app_settings" ON app_settings;
CREATE POLICY "public write app_settings" ON app_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public update app_settings" ON app_settings;
CREATE POLICY "public update app_settings" ON app_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public delete app_settings" ON app_settings;
CREATE POLICY "public delete app_settings" ON app_settings FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read webhook_log" ON webhook_log;
CREATE POLICY "public read webhook_log" ON webhook_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public write webhook_log" ON webhook_log;
CREATE POLICY "public write webhook_log" ON webhook_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public update webhook_log" ON webhook_log;
CREATE POLICY "public update webhook_log" ON webhook_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public delete webhook_log" ON webhook_log;
CREATE POLICY "public delete webhook_log" ON webhook_log FOR DELETE TO anon, authenticated USING (true);

INSERT INTO app_settings (key, value) VALUES
  ('admin_code', 'ICFL2026'),
  ('stats_webhook_url', ''),
  ('season', '1'),
  ('current_week', '1')
ON CONFLICT (key) DO NOTHING;

INSERT INTO playoff_slots (round, slot_index) VALUES
  ('Wildcard', 1), ('Wildcard', 2), ('Wildcard', 3), ('Wildcard', 4),
  ('Divisional', 1), ('Divisional', 2),
  ('Championship', 1),
  ('ICFL Bowl', 1)
ON CONFLICT (round, slot_index) DO NOTHING;
