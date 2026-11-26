export interface Team {
  id: string
  name: string
  abbreviation: string
  emoji: string
  logo_url: string
  conference: string
  division: string
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  streak: string
}

export interface Game {
  id: string
  season: number
  week: number
  home_team_id: string | null
  away_team_id: string | null
  home_score: number | null
  away_score: number | null
  status: string
  game_time: string
}

export interface PlayerStat {
  id: string
  player_name: string
  team_name: string
  position: string
  games_played: number
  passing_yards: number
  passing_tds: number
  interceptions: number
  rushing_yards: number
  rushing_tds: number
  receptions: number
  receiving_yards: number
  receiving_tds: number
  tackles: number
  sacks: number
  picks: number
}

export interface PlayoffSlot {
  id: string
  round: string
  slot_index: number
  team1_id: string | null
  team2_id: string | null
  team1_score: number | null
  team2_score: number | null
  winner_id: string | null
}

export const ROUNDS = ['Wildcard', 'Divisional', 'Championship', 'ICFL Bowl'] as const
