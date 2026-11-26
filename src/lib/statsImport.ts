import type { PlayerStat } from './types'

// Maps the Roblox Ultimate Football stat-export column names (and common
// variants) to our player_stats columns. Matching is case/space-insensitive.
const ALIASES: Record<string, keyof PlayerStat | 'ignore'> = {
  player: 'player_name',
  playername: 'player_name',
  name: 'player_name',
  username: 'player_name',
  team: 'team_name',
  teamname: 'team_name',
  pos: 'position',
  position: 'position',
  gp: 'games_played',
  games: 'games_played',
  gamesplayed: 'games_played',
  'pass yds': 'passing_yards',
  passyds: 'passing_yards',
  passingyards: 'passing_yards',
  'pass yards': 'passing_yards',
  pyds: 'passing_yards',
  'pass td': 'passing_tds',
  passtds: 'passing_tds',
  passingtds: 'passing_tds',
  'pass tds': 'passing_tds',
  int: 'interceptions',
  ints: 'interceptions',
  interceptions: 'interceptions',
  'rush yds': 'rushing_yards',
  rushyds: 'rushing_yards',
  rushingyards: 'rushing_yards',
  'rush yards': 'rushing_yards',
  ryds: 'rushing_yards',
  'rush td': 'rushing_tds',
  rushtds: 'rushing_tds',
  rushingtds: 'rushing_tds',
  rec: 'receptions',
  receptions: 'receptions',
  'rec yds': 'receiving_yards',
  recyds: 'receiving_yards',
  receivingyards: 'receiving_yards',
  'rec yards': 'receiving_yards',
  'receiving yards': 'receiving_yards',
  'rec td': 'receiving_tds',
  rectds: 'receiving_tds',
  receivingtds: 'receiving_tds',
  tackles: 'tackles',
  tkl: 'tackles',
  sacks: 'sacks',
  picks: 'picks',
  'picks ': 'picks',
  defint: 'picks',
  'def int': 'picks',
}

function normKey(k: string): string {
  return k.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

export function mapRowToStat(row: Record<string, unknown>): Partial<PlayerStat> | null {
  const out: Partial<PlayerStat> = {}
  let hasName = false
  for (const [rawKey, rawVal] of Object.entries(row)) {
    const mapped = ALIASES[normKey(rawKey)]
    if (!mapped || mapped === 'ignore') continue
    if (mapped === 'player_name') {
      const s = String(rawVal ?? '').trim()
      if (s) {
        out.player_name = s
        hasName = true
      }
      continue
    }
    const n = Number(String(rawVal ?? '').replace(/[^0-9.\-]/g, ''))
    ;(out as Record<string, unknown>)[mapped] = Number.isFinite(n) ? Math.round(n) : 0
  }
  return hasName ? out : null
}

export function mergeStat(
  existing: PlayerStat | undefined,
  incoming: Partial<PlayerStat>,
): PlayerStat {
  if (!existing) {
    return {
      id: '',
      player_name: incoming.player_name ?? '',
      team_name: incoming.team_name ?? '',
      position: incoming.position ?? '',
      games_played: incoming.games_played ?? 0,
      passing_yards: incoming.passing_yards ?? 0,
      passing_tds: incoming.passing_tds ?? 0,
      interceptions: incoming.interceptions ?? 0,
      rushing_yards: incoming.rushing_yards ?? 0,
      rushing_tds: incoming.rushing_tds ?? 0,
      receptions: incoming.receptions ?? 0,
      receiving_yards: incoming.receiving_yards ?? 0,
      receiving_tds: incoming.receiving_tds ?? 0,
      tackles: incoming.tackles ?? 0,
      sacks: incoming.sacks ?? 0,
      picks: incoming.picks ?? 0,
    }
  }
  // Numeric stat columns ADD together (weekly imports accumulate).
  const sum = (a: number, b: number | undefined) => a + (b ?? 0)
  const replaceIfSet = (a: string, b: string | undefined) => (b && b.length ? b : a)
  return {
    ...existing,
    team_name: replaceIfSet(existing.team_name, incoming.team_name),
    position: replaceIfSet(existing.position, incoming.position),
    games_played: sum(existing.games_played, incoming.games_played),
    passing_yards: sum(existing.passing_yards, incoming.passing_yards),
    passing_tds: sum(existing.passing_tds, incoming.passing_tds),
    interceptions: sum(existing.interceptions, incoming.interceptions),
    rushing_yards: sum(existing.rushing_yards, incoming.rushing_yards),
    rushing_tds: sum(existing.rushing_tds, incoming.rushing_tds),
    receptions: sum(existing.receptions, incoming.receptions),
    receiving_yards: sum(existing.receiving_yards, incoming.receiving_yards),
    receiving_tds: sum(existing.receiving_tds, incoming.receiving_tds),
    tackles: sum(existing.tackles, incoming.tackles),
    sacks: sum(existing.sacks, incoming.sacks),
    picks: sum(existing.picks, incoming.picks),
  }
}
