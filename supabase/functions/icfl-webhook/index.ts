import { createClient } from 'npm:@supabase/supabase-js@2.119.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const STAT_FIELDS = [
  'games_played',
  'passing_yards',
  'passing_tds',
  'interceptions',
  'rushing_yards',
  'rushing_tds',
  'receptions',
  'receiving_yards',
  'receiving_tds',
  'tackles',
  'sacks',
  'picks',
] as const

const FIELD_ALIASES: Record<string, string> = {
  player: 'player_name',
  name: 'player_name',
  username: 'player_name',
  team: 'team_name',
  position: 'position',
  pos: 'position',
  gp: 'games_played',
  games: 'games_played',
  gamesplayed: 'games_played',
  pyds: 'passing_yards',
  'pass yds': 'passing_yards',
  'pass yards': 'passing_yards',
  passingyards: 'passing_yards',
  'pass td': 'passing_tds',
  'pass tds': 'passing_tds',
  passtds: 'passing_tds',
  passingtds: 'passing_tds',
  int: 'interceptions',
  interceptions: 'interceptions',
  ryds: 'rushing_yards',
  'rush yds': 'rushing_yards',
  'rush yards': 'rushing_yards',
  rushingyards: 'rushing_yards',
  'rush td': 'rushing_tds',
  'rush tds': 'rushing_tds',
  rushtds: 'rushing_tds',
  rushingtds: 'rushing_tds',
  rec: 'receptions',
  receptions: 'receptions',
  recyds: 'receiving_yards',
  'rec yds': 'receiving_yards',
  'rec yards': 'receiving_yards',
  'receiving yards': 'receiving_yards',
  receivingyards: 'receiving_yards',
  'rec td': 'receiving_tds',
  'rec tds': 'receiving_tds',
  rectds: 'receiving_tds',
  receivingtds: 'receiving_tds',
  tackles: 'tackles',
  tkl: 'tackles',
  sacks: 'sacks',
  picks: 'picks',
}

function normKey(k: string): string {
  return k.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

function parseRow(row: Record<string, unknown>) {
  const out: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(row)) {
    const mapped = FIELD_ALIASES[normKey(k)]
    if (!mapped) continue
    if (mapped === 'player_name' || mapped === 'team_name' || mapped === 'position') {
      const s = String(v ?? '').trim()
      if (s) out[mapped] = s
    } else {
      const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''))
      out[mapped] = Number.isFinite(n) ? Math.round(n) : 0
    }
  }
  return out
}

async function importStats(rows: Record<string, unknown>[]) {
  const parsed = rows.map(parseRow).filter((r) => r.player_name)
  if (!parsed.length) return { imported: 0, error: 'No valid rows found' }

  const names = [...new Set(parsed.map((r) => String(r.player_name)))]
  const { data: existing, error: fetchErr } = await supabase
    .from('player_stats')
    .select('*')
    .in('player_name', names)
  if (fetchErr) return { imported: 0, error: fetchErr.message }

  const byName = new Map((existing ?? []).map((s) => [s.player_name, s]))
  let imported = 0
  const errors: string[] = []

  for (const row of parsed) {
    const name = String(row.player_name)
    const prior = byName.get(name)
    const upsert: Record<string, unknown> = { player_name: name, updated_at: new Date().toISOString() }
    for (const f of STAT_FIELDS) {
      const inc = Number(row[f] ?? 0)
      upsert[f] = prior ? Number(prior[f] ?? 0) + inc : inc
    }
    if (row.team_name) upsert.team_name = row.team_name
    if (row.position) upsert.position = row.position

    if (prior) {
      const { error } = await supabase.from('player_stats').update(upsert).eq('id', prior.id)
      if (error) errors.push(`${name}: ${error.message}`)
      else imported++
    } else {
      const { error } = await supabase.from('player_stats').insert(upsert)
      if (error) errors.push(`${name}: ${error.message}`)
      else imported++
    }
  }
  return { imported, errors: errors.slice(0, 5) }
}

async function updateGame(row: Record<string, unknown>) {
  const week = Number(row.week)
  const home = String(row.home ?? row.home_team ?? '').toUpperCase()
  const away = String(row.away ?? row.away_team ?? '').toUpperCase()
  const homeScore = row.home_score === null || row.home_score === undefined ? null : Number(row.home_score)
  const awayScore = row.away_score === null || row.away_score === undefined ? null : Number(row.away_score)

  const { data: teams } = await supabase.from('teams').select('id, abbreviation')
  const find = (a: string) => teams?.find((t) => t.abbreviation.toUpperCase() === a)?.id ?? null
  const homeId = find(home)
  const awayId = find(away)
  if (!homeId || !awayId) return { error: `Unknown team abbreviation: ${home} / ${away}` }

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('week', week)
    .eq('home_team_id', homeId)
    .eq('away_team_id', awayId)
    .maybeSingle()

  const status = homeScore === null || awayScore === null ? 'scheduled' : 'final'
  if (game) {
    const { error } = await supabase
      .from('games')
      .update({ home_score: homeScore, away_score: awayScore, status })
      .eq('id', game.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('games').insert({
      week,
      home_team_id: homeId,
      away_team_id: awayId,
      home_score: homeScore,
      away_score: awayScore,
      status,
    })
    if (error) return { error: error.message }
  }
  return { ok: true }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({}, 200)
  try {
    const body = await req.json()
    const rows: Record<string, unknown>[] = Array.isArray(body) ? body : [body]
    const results: Record<string, unknown>[] = []

    for (const row of rows) {
      const lower = JSON.stringify(row).toLowerCase()
      if ('home' in row || 'home_team' in row) {
        results.push(await updateGame(row))
      } else if (lower.includes('player') || lower.includes('pass') || lower.includes('tackle')) {
        results.push(await importStats(rows))
        break
      } else {
        results.push({ error: 'Unrecognized payload shape' })
      }
    }

    await supabase.from('webhook_log').insert({
      source: 'uf-webhook',
      payload: body,
      result: JSON.stringify(results).slice(0, 500),
    })

    return json({ ok: true, results })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
