import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { supabase, ADMIN_CODE_KEY } from '../lib/supabase'
import { DEFAULT_TEAMS } from '../lib/teams'
import { mapRowToStat, mergeStat } from '../lib/statsImport'
import { ROUNDS, type Game, type PlayerStat, type PlayoffSlot, type Team } from '../lib/types'

interface AdminProps {
  isAdmin: boolean
  onSignIn: () => void
  onSignOut: () => void
  data: {
    teams: Team[]
    games: Game[]
    stats: PlayerStat[]
    slots: PlayoffSlot[]
    refresh: () => Promise<void>
  }
  toast: (m: string) => void
}

export default function AdminPanel({ isAdmin, onSignIn, onSignOut, data, toast }: AdminProps) {
  if (!isAdmin) return <AdminLogin onSignIn={onSignIn} toast={toast} />
  return (
    <AdminDashboard
      onSignOut={onSignOut}
      teams={data.teams}
      games={data.games}
      stats={data.stats}
      slots={data.slots}
      refresh={data.refresh}
      toast={toast}
    />
  )
}

function AdminLogin({ onSignIn, toast }: { onSignIn: () => void; toast: (m: string) => void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'admin_code')
      .maybeSingle()
    setBusy(false)
    if (data?.value && code && code.toLowerCase() === data.value.toLowerCase()) {
      sessionStorage.setItem(ADMIN_CODE_KEY, '1')
      onSignIn()
      toast('Admin mode enabled')
    } else {
      toast('Incorrect admin code')
    }
  }

  return (
    <div className="container admin-page">
      <div className="card login-card">
        <h2>League Admin Sign-In</h2>
        <p className="muted">Enter the league admin code to manage standings, scores, stats and the bracket.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            type="password"
            placeholder="Admin code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ width: '100%', marginBottom: 12 }}
          />
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Checking...' : 'Enter Admin Mode'}
          </button>
        </form>
      </div>
      <style>{`
        .admin-page { padding: 60px 20px; flex: 1; display: flex; justify-content: center; }
        .login-card { padding: 30px; max-width: 400px; width: 100%; height: fit-content; }
        .login-card h2 { margin-bottom: 8px; }
        .login-card p { margin: 0 0 18px; font-size: 0.88rem; }
      `}</style>
    </div>
  )
}

function AdminDashboard({
  onSignOut,
  teams,
  games,
  stats,
  slots,
  refresh,
  toast,
}: {
  onSignOut: () => void
  teams: Team[]
  games: Game[]
  stats: PlayerStat[]
  slots: PlayoffSlot[]
  refresh: () => Promise<void>
  toast: (m: string) => void
}) {
  const [section, setSection] = useState('scores')
  const sections = [
    ['scores', 'Scores & Standings'],
    ['stats', 'Stats Import'],
    ['webhook', 'Webhook / CSV'],
    ['bracket', 'Playoff Bracket'],
    ['teams', 'Teams'],
    ['streams', 'Stream Links'],
    ['settings', 'Settings & Reset'],
  ] as const

  return (
    <div className="container admin-page">
      <div className="admin-head">
        <h2 className="section-title">League Admin</h2>
        <button className="btn btn-ghost btn-sm" onClick={onSignOut}>
          Exit admin mode
        </button>
      </div>
      <div className="admin-tabs">
        {sections.map(([id, label]) => (
          <button
            key={id}
            className={`btn btn-sm ${section === id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'scores' && <ScoresSection teams={teams} games={games} refresh={refresh} toast={toast} />}
      {section === 'stats' && <StatsSection stats={stats} refresh={refresh} toast={toast} />}
      {section === 'webhook' && <WebhookSection teams={teams} refresh={refresh} toast={toast} />}
      {section === 'bracket' && <BracketSection teams={teams} slots={slots} refresh={refresh} toast={toast} />}
      {section === 'teams' && <TeamsSection teams={teams} refresh={refresh} toast={toast} />}
      {section === 'streams' && <StreamsSection toast={toast} />}
      {section === 'settings' && <SettingsSection teams={teams} stats={stats} games={games} refresh={refresh} toast={toast} />}

      <style>{`
        .admin-page { padding: 36px 20px 70px; flex: 1; }
        .admin-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .admin-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 18px 0 24px; }
        .admin-section { max-width: 900px; }
        .admin-section h3 { font-size: 1.15rem; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
        .admin-section .hint { font-size: 0.85rem; margin: 0 0 16px; }
        .row-grid { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .card.sub { padding: 20px; margin-bottom: 20px; }
      `}</style>
    </div>
  )
}

/* ---------------- Scores & Standings ---------------- */

function ScoresSection({
  teams,
  games,
  refresh,
  toast,
}: {
  teams: Team[]
  games: Game[]
  refresh: () => Promise<void>
  toast: (m: string) => void
}) {
  const [season, setSeason] = useState(1)
  const [week, setWeek] = useState(1)
  const [awayId, setAwayId] = useState('')
  const [homeId, setHomeId] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [homeScore, setHomeScore] = useState('')
  const [status, setStatus] = useState('scheduled')

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])

  const addGame = async () => {
    if (!awayId || !homeId || awayId === homeId) {
      toast('Pick two different teams')
      return
    }
    const { error } = await supabase.from('games').insert({
      season,
      week,
      away_team_id: awayId,
      home_team_id: homeId,
      away_score: awayScore === '' ? null : Number(awayScore),
      home_score: homeScore === '' ? null : Number(homeScore),
      status,
    })
    if (error) toast(error.message)
    else {
      toast('Game added')
      setAwayScore('')
      setHomeScore('')
      await recalcStandings(teams, refresh, toast)
    }
  }

  const saveScore = async (g: Game, as: string, hs: string, st: string) => {
    const { error } = await supabase
      .from('games')
      .update({
        away_score: as === '' ? null : Number(as),
        home_score: hs === '' ? null : Number(hs),
        status: st,
      })
      .eq('id', g.id)
    if (error) toast(error.message)
    else {
      toast('Score saved')
      await recalcStandings(teams, refresh, toast)
    }
  }

  const deleteGame = async (g: Game) => {
    const { error } = await supabase.from('games').delete().eq('id', g.id)
    if (error) toast(error.message)
    else {
      toast('Game removed')
      await recalcStandings(teams, refresh, toast)
    }
  }

  const shown = games.filter((g) => g.season === season)

  return (
    <div className="admin-section">
      <div className="card sub">
        <h3>Add Game</h3>
        <p className="hint muted">Add a matchup to the schedule. Leave scores empty for N/A until updated.</p>
        <div className="row-grid">
          <input type="number" value={season} onChange={(e) => setSeason(Number(e.target.value))} style={{ width: 80 }} title="Season" />
          <select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
            {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
          <select value={awayId} onChange={(e) => setAwayId(e.target.value)}>
            <option value="">Away team...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.abbreviation} {t.name}
              </option>
            ))}
          </select>
          <span className="muted">@</span>
          <select value={homeId} onChange={(e) => setHomeId(e.target.value)}>
            <option value="">Home team...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.abbreviation} {t.name}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">Live</option>
            <option value="final">Final</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={addGame}>
            Add game
          </button>
        </div>
      </div>

      <div className="card sub">
        <h3>Update Scores</h3>
        <p className="hint muted">Scores show as N/A on the site until you enter them and mark the game Final.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Wk</th>
                <th>Matchup</th>
                <th>Away</th>
                <th>Home</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((g) => {
                const away = g.away_team_id ? teamById.get(g.away_team_id) : undefined
                const home = g.home_team_id ? teamById.get(g.home_team_id) : undefined
                return (
                  <GameRow
                    key={g.id}
                    g={g}
                    away={away?.abbreviation ?? '?'}
                    home={home?.abbreviation ?? '?'}
                    onSave={saveScore}
                    onDelete={deleteGame}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card sub">
        <h3>Manual Record Edit</h3>
        <p className="hint muted">Fine-tune any team's record, points and streak directly.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>W</th>
                <th>L</th>
                <th>T</th>
                <th>PF</th>
                <th>PA</th>
                <th>Streak</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <TeamRecordRow key={t.id} t={t} toast={toast} refresh={refresh} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function GameRow({
  g,
  away,
  home,
  onSave,
  onDelete,
}: {
  g: Game
  away: string
  home: string
  onSave: (g: Game, as: string, hs: string, st: string) => void
  onDelete: (g: Game) => void
}) {
  const [as, setAs] = useState(g.away_score?.toString() ?? '')
  const [hs, setHs] = useState(g.home_score?.toString() ?? '')
  const [st, setSt] = useState(g.status)
  return (
    <tr>
      <td>{g.week}</td>
      <td>
        {away} @ {home}
      </td>
      <td>
        <input value={as} onChange={(e) => setAs(e.target.value)} style={{ width: 60 }} placeholder="N/A" />
      </td>
      <td>
        <input value={hs} onChange={(e) => setHs(e.target.value)} style={{ width: 60 }} placeholder="N/A" />
      </td>
      <td>
        <select value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">Live</option>
          <option value="final">Final</option>
        </select>
      </td>
      <td>
        <button className="btn btn-sm btn-primary" onClick={() => onSave(g, as, hs, st)}>
          Save
        </button>{' '}
        <button className="btn btn-sm btn-danger" onClick={() => onDelete(g)}>
          X
        </button>
      </td>
    </tr>
  )
}

function TeamRecordRow({
  t,
  toast,
  refresh,
}: {
  t: Team
  toast: (m: string) => void
  refresh: () => Promise<void>
}) {
  const [w, setW] = useState(t.wins)
  const [l, setL] = useState(t.losses)
  const [ti, setTi] = useState(t.ties)
  const [pf, setPf] = useState(t.points_for)
  const [pa, setPa] = useState(t.points_against)
  const [streak, setStreak] = useState(t.streak)

  const save = async () => {
    const { error } = await supabase
      .from('teams')
      .update({ wins: w, losses: l, ties: ti, points_for: pf, points_against: pa, streak })
      .eq('id', t.id)
    if (error) toast(error.message)
    else {
      toast(`${t.abbreviation} updated`)
      await refresh()
    }
  }

  return (
    <tr>
      <td>
        {t.emoji} {t.abbreviation}
      </td>
      {[
        [w, setW] as const,
        [l, setL] as const,
        [ti, setTi] as const,
        [pf, setPf] as const,
        [pa, setPa] as const,
      ].map(([v, set], i) => (
        <td key={i}>
          <input
            type="number"
            value={v}
            onChange={(e) => set(Number(e.target.value))}
            style={{ width: 56 }}
          />
        </td>
      ))}
      <td>
        <input value={streak} onChange={(e) => setStreak(e.target.value)} style={{ width: 60 }} placeholder="W2/L1" />
      </td>
      <td>
        <button className="btn btn-sm btn-primary" onClick={save}>
          Save
        </button>
      </td>
    </tr>
  )
}

async function recalcStandings(
  teams: Team[],
  refresh: () => Promise<void>,
  toast: (m: string) => void,
) {
  const { data: allGames, error } = await supabase.from('games').select('*').eq('status', 'final')
  if (error) {
    toast(error.message)
    return
  }
  for (const t of teams) {
    let w = 0
    let l = 0
    let ti = 0
    let pf = 0
    let pa = 0
    for (const g of allGames ?? []) {
      if (g.home_team_id !== t.id && g.away_team_id !== t.id) continue
      if (g.home_score === null || g.away_score === null) continue
      const isHome = g.home_team_id === t.id
      const our = isHome ? g.home_score : g.away_score
      const their = isHome ? g.away_score : g.home_score
      pf += our
      pa += their
      if (our > their) w++
      else if (our < their) l++
      else ti++
    }
    await supabase.from('teams').update({ wins: w, losses: l, ties: ti, points_for: pf, points_against: pa }).eq('id', t.id)
  }
  await refresh()
}

/* ---------------- Stats Import ---------------- */

function StatsSection({
  stats,
  refresh,
  toast,
}: {
  stats: PlayerStat[]
  refresh: () => Promise<void>
  toast: (m: string) => void
}) {
  const [rows, setRows] = useState('')
  const [busy, setBusy] = useState(false)
  const [replace, setReplace] = useState(false)

  const importText = async () => {
    if (!rows.trim()) {
      toast('Paste CSV text or rows first')
      return
    }
    setBusy(true)
    const parsed = Papa.parse<Record<string, unknown>>(rows.trim(), {
      header: true,
      skipEmptyLines: true,
    })
    const mapped = parsed.data.map(mapRowToStat).filter((x): x is NonNullable<typeof x> => !!x)
    if (!mapped.length) {
      setBusy(false)
      toast('No valid rows found — check column names (Player, Team, Pass Yds, etc.)')
      return
    }
    // Group by player name so repeated rows for the same player accumulate.
    const grouped = new Map<string, Partial<PlayerStat>>()
    for (const m of mapped) {
      const key = m.player_name
      const prev = grouped.get(key)
      if (prev) {
        for (const [k, v] of Object.entries(m)) {
          if (typeof v === 'number') (prev as Record<string, unknown>)[k] = ((prev as Record<string, unknown>)[k] as number ?? 0) + v
          else if (v) (prev as Record<string, unknown>)[k] = v
        }
      } else {
        grouped.set(key, { ...m })
      }
    }

    let ok = 0
    for (const [name, inc] of grouped) {
      const existing = stats.find((s) => s.player_name.toLowerCase() === name.toLowerCase())
      if (replace && existing) {
        const { error } = await supabase
          .from('player_stats')
          .update({ ...inc, player_name: name, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (!error) ok++
      } else {
        const merged = mergeStat(existing, inc)
        if (existing) {
          const { error } = await supabase
            .from('player_stats')
            .update({ ...merged, id: undefined, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
          if (!error) ok++
        } else {
          const { error } = await supabase.from('player_stats').insert({ ...merged, id: undefined })
          if (!error) ok++
        }
      }
    }
    setBusy(false)
    await refresh()
    toast(`Imported ${ok} player${ok === 1 ? '' : 's'}`)
    setRows('')
  }

  const deletePlayer = async (s: PlayerStat) => {
    const { error } = await supabase.from('player_stats').delete().eq('id', s.id)
    if (error) toast(error.message)
    else {
      toast(`${s.player_name} removed`)
      await refresh()
    }
  }

  return (
    <div className="admin-section">
      <div className="card sub">
        <h3>Import Player Stats</h3>
        <p className="hint muted">
          Paste CSV from Roblox Ultimate Football (or any CSV). First row must be headers, e.g.{' '}
          <code>Player, Team, Position, GP, Pass Yds, Pass TD, INT, Rush Yds, Rush TD, Rec, Rec Yds, Rec TD, Tackles, Sacks, Picks</code>.
          Column names are matched flexibly. Stats accumulate per player unless "Replace" is checked.
        </p>
        <textarea
          value={rows}
          onChange={(e) => setRows(e.target.value)}
          rows={8}
          placeholder={`Player,Team,GP,Pass Yds,Pass TD,INT,Rush Yds,Rush TD,Rec,Rec Yds,Rec TD,Tackles,Sacks,Picks\nMVP_Sniper,KC,1,320,4,1,15,0,0,0,0,2,0,0`}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
        />
        <div className="row-grid" style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            Replace existing totals instead of adding
          </label>
          <button className="btn btn-primary" onClick={importText} disabled={busy}>
            {busy ? 'Importing...' : 'Import stats'}
          </button>
        </div>
      </div>

      <div className="card sub">
        <h3>Current Stats ({stats.length} players)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Pass Yds</th>
                <th>Pass TD</th>
                <th>Rush Yds</th>
                <th>Rec Yds</th>
                <th>Tkl</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.id}>
                  <td>{s.player_name}</td>
                  <td className="muted">{s.team_name}</td>
                  <td>{s.passing_yards}</td>
                  <td>{s.passing_tds}</td>
                  <td>{s.rushing_yards}</td>
                  <td>{s.receiving_yards}</td>
                  <td>{s.tackles}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => deletePlayer(s)}>
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Webhook / CSV ---------------- */

function WebhookSection({
  teams,
  refresh,
  toast,
}: {
  teams: Team[]
  refresh: () => Promise<void>
  toast: (m: string) => void
}) {
  const [payload, setPayload] = useState('')
  const [busy, setBusy] = useState(false)
  const [discordUrl, setDiscordUrl] = useState('')
  const [syncReady, setSyncReady] = useState(false)

  useMemo(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'stats_webhook_url')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setDiscordUrl(data.value)
        setSyncReady(true)
      })
  }, [])

  const sendToFunction = async () => {
    if (!payload.trim()) {
      toast('Paste webhook JSON or CSV first')
      return
    }
    setBusy(true)
    let body: unknown
    try {
      body = JSON.parse(payload)
    } catch {
      const parsed = Papa.parse<Record<string, unknown>>(payload.trim(), {
        header: true,
        skipEmptyLines: true,
      })
      body = parsed.data
    }
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/icfl-webhook`
    try {
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`)
      const results = json.results as Record<string, unknown>[]
      const errs = results.filter((r) => r.error)
      if (errs.length) toast(`Done with issues: ${String(errs[0].error)}`)
      else toast('Webhook data imported successfully')
      await refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Webhook import failed')
    }
    setBusy(false)
  }

  const saveDiscord = async () => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'stats_webhook_url', value: discordUrl, updated_at: new Date().toISOString() })
    if (error) toast(error.message)
    else toast('Discord webhook saved — stat updates will post there')
  }

  const testDiscord = async () => {
    if (!discordUrl) {
      toast('Save a Discord webhook URL first')
      return
    }
    try {
      const res = await fetch(discordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'ICFL stats sync is connected. Stat imports will be posted here.' }),
      })
      toast(res.ok ? 'Test message sent to Discord' : `Discord returned ${res.status}`)
    } catch {
      toast('Could not reach Discord — check the webhook URL')
    }
  }

  return (
    <div className="admin-section">
      <div className="card sub">
        <h3>Roblox Ultimate Football Webhook / CSV</h3>
        <p className="hint muted">
          Paste a webhook JSON payload or CSV export from the Roblox Ultimate Football stat system and import it.
          Both game scores and player stats are detected automatically.
        </p>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={8}
          placeholder={`Paste JSON like:\n[{"player":"MVP_Sniper","team":"KC","pass_yds":320,"pass_td":4}]\n\nor game results:\n[{"week":1,"home":"KC","away":"BUF","home_score":28,"away_score":21}]\n\nor paste CSV with a header row`}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
        />
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={sendToFunction} disabled={busy}>
          {busy ? 'Importing...' : 'Import webhook data'}
        </button>
      </div>

      <div className="card sub">
        <h3>Discord Stats Sync</h3>
        <p className="hint muted">
          Paste a Discord channel webhook URL. Every stat import can be mirrored to your Discord — run a test to
          confirm the connection.
        </p>
        {syncReady && (
          <>
            <div className="row-grid">
              <input
                value={discordUrl}
                onChange={(e) => setDiscordUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                style={{ flex: 1, minWidth: 260 }}
              />
              <button className="btn btn-primary btn-sm" onClick={saveDiscord}>
                Save
              </button>
              <button className="btn btn-ghost btn-sm" onClick={testDiscord}>
                Send test
              </button>
            </div>
            <p className="hint muted" style={{ marginTop: 10 }}>
              Tip: to auto-post imports to Discord, also connect this same URL in your Roblox Ultimate Football
              webhook settings — the league's import endpoint accepts both formats.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------------- Bracket ---------------- */

function BracketSection({
  teams,
  slots,
  refresh,
  toast,
}: {
  teams: Team[]
  slots: PlayoffSlot[]
  refresh: () => Promise<void>
  toast: (m: string) => void
}) {
  const update = async (slot: PlayoffSlot, patch: Partial<PlayoffSlot>) => {
    const { error } = await supabase.from('playoff_slots').update(patch).eq('id', slot.id)
    if (error) toast(error.message)
    else {
      await refresh()
    }
  }

  const autoAdvance = async () => {
    let changed = 0
    for (const slot of slots) {
      if (slot.team1_score === null || slot.team2_score === null) continue
      const winner =
        slot.team1_score > slot.team2_score
          ? slot.team1_id
          : slot.team2_score > slot.team1_score
            ? slot.team2_id
            : null
      if (winner && winner !== slot.winner_id) {
        await supabase.from('playoff_slots').update({ winner_id: winner }).eq('id', slot.id)
        changed++
      }
    }
    // Advance winners into next rounds by slot order
    for (let r = 0; r < ROUNDS.length - 1; r++) {
      const cur = slots.filter((s) => s.round === ROUNDS[r]).sort((a, b) => a.slot_index - b.slot_index)
      const next = slots.filter((s) => s.round === ROUNDS[r + 1]).sort((a, b) => a.slot_index - b.slot_index)
      const winners = cur.map((s) => s.winner_id).filter(Boolean)
      for (let i = 0; i < next.length; i++) {
        const t1 = winners[i * 2]
        const t2 = winners[i * 2 + 1]
        if (t1 && t2 && (next[i].team1_id !== t1 || next[i].team2_id !== t2)) {
          await supabase
            .from('playoff_slots')
            .update({ team1_id: t1, team2_id: t2, team1_score: null, team2_score: null, winner_id: null })
            .eq('id', next[i].id)
          changed++
        }
      }
    }
    await refresh()
    toast(changed ? `Bracket updated (${changed} changes)` : 'No changes to advance')
  }

  return (
    <div className="admin-section">
      <div className="card sub">
        <h3>Edit Playoff Bracket</h3>
        <p className="hint muted">
          Seed teams into each round, enter scores, then use "Advance Winners" to push winners into the next round.
        </p>
        <button className="btn btn-primary btn-sm" onClick={autoAdvance} style={{ marginBottom: 16 }}>
          Advance Winners
        </button>
        {ROUNDS.map((round) => {
          const rs = slots.filter((s) => s.round === round).sort((a, b) => a.slot_index - b.slot_index)
          return (
            <div key={round} style={{ marginBottom: 24 }}>
              <h4 style={{ color: 'var(--gold-300)', marginBottom: 8 }}>{round}</h4>
              {rs.map((slot) => (
                <div key={slot.id} className="row-grid" style={{ marginBottom: 10 }}>
                  <select
                    value={slot.team1_id ?? ''}
                    onChange={(e) => update(slot, { team1_id: e.target.value || null })}
                  >
                    <option value="">Team 1...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.abbreviation} {t.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={slot.team1_score ?? ''}
                    onChange={(e) =>
                      update(slot, { team1_score: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    placeholder="-"
                    style={{ width: 60 }}
                  />
                  <span className="muted">vs</span>
                  <input
                    type="number"
                    value={slot.team2_score ?? ''}
                    onChange={(e) =>
                      update(slot, { team2_score: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    placeholder="-"
                    style={{ width: 60 }}
                  />
                  <select
                    value={slot.team2_id ?? ''}
                    onChange={(e) => update(slot, { team2_id: e.target.value || null })}
                  >
                    <option value="">Team 2...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.abbreviation} {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------------- Teams ---------------- */

function TeamsSection({
  teams,
  refresh,
  toast,
}: {
  teams: Team[]
  refresh: () => Promise<void>
  toast: (m: string) => void
}) {
  const [name, setName] = useState('')
  const [abbr, setAbbr] = useState('')
  const [emoji, setEmoji] = useState('')
  const [logo, setLogo] = useState('')
  const [conf, setConf] = useState('AFC')
  const [div, setDiv] = useState('East')

  const add = async () => {
    if (!name || !abbr) {
      toast('Name and abbreviation required')
      return
    }
    const { error } = await supabase
      .from('teams')
      .insert({ name, abbreviation: abbr, emoji, logo_url: logo, conference: conf, division: div })
    if (error) toast(error.message)
    else {
      toast('Team added')
      setName('')
      setAbbr('')
      setEmoji('')
      setLogo('')
      await refresh()
    }
  }

  const remove = async (t: Team) => {
    const { error } = await supabase.from('teams').delete().eq('id', t.id)
    if (error) toast(error.message)
    else {
      toast(`${t.name} removed`)
      await refresh()
    }
  }

  const update = async (t: Team, patch: Partial<Team>) => {
    const { error } = await supabase.from('teams').update(patch).eq('id', t.id)
    if (error) toast(error.message)
    else await refresh()
  }

  return (
    <div className="admin-section">
      <div className="card sub">
        <h3>Add Team</h3>
        <p className="hint muted">Add a Roblox league franchise with its emoji and logo image URL.</p>
        <div className="row-grid">
          <input placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="ABR" value={abbr} onChange={(e) => setAbbr(e.target.value)} style={{ width: 70 }} />
          <input placeholder="Emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} style={{ width: 70 }} />
          <input placeholder="Logo URL (optional)" value={logo} onChange={(e) => setLogo(e.target.value)} />
          <select value={conf} onChange={(e) => setConf(e.target.value)}>
            <option>AFC</option>
            <option>NFC</option>
          </select>
          <select value={div} onChange={(e) => setDiv(e.target.value)}>
            {['East', 'North', 'South', 'West'].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={add}>
            Add team
          </button>
        </div>
      </div>

      <div className="card sub">
        <h3>Manage Teams ({teams.length})</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>Name</th>
                <th>Emoji</th>
                <th>Logo URL</th>
                <th>Conf</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id}>
                  <td>{t.abbreviation}</td>
                  <td>
                    <input
                      defaultValue={t.name}
                      onBlur={(e) => e.target.value !== t.name && update(t, { name: e.target.value })}
                      style={{ width: 170 }}
                    />
                  </td>
                  <td>
                    <input
                      defaultValue={t.emoji}
                      onBlur={(e) => e.target.value !== t.emoji && update(t, { emoji: e.target.value })}
                      style={{ width: 50 }}
                    />
                  </td>
                  <td>
                    <input
                      defaultValue={t.logo_url}
                      onBlur={(e) => e.target.value !== t.logo_url && update(t, { logo_url: e.target.value })}
                      style={{ width: 260 }}
                      placeholder="https://..."
                    />
                  </td>
                  <td>
                    <select
                      value={t.conference}
                      onChange={(e) => update(t, { conference: e.target.value })}
                    >
                      <option>AFC</option>
                      <option>NFC</option>
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(t)}>
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Streams ---------------- */

function StreamsSection({ toast }: { toast: (m: string) => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({ tiktok: '', twitch: '', youtube: '' })
  const [loaded, setLoaded] = useState(false)

  useMemo(() => {
    supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['stream_tiktok', 'stream_twitch', 'stream_youtube'])
      .then(({ data }) => {
        if (data) {
          setUrls({
            tiktok: data.find((s) => s.key === 'stream_tiktok')?.value ?? '',
            twitch: data.find((s) => s.key === 'stream_twitch')?.value ?? '',
            youtube: data.find((s) => s.key === 'stream_youtube')?.value ?? '',
          })
        }
        setLoaded(true)
      })
  }, [])

  const save = async () => {
    const updates = Object.entries(urls).map(([k, v]) => ({
      key: `stream_${k}`,
      value: v,
      updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('app_settings').upsert(updates)
    if (error) toast(error.message)
    else toast('Stream links saved')
  }

  if (!loaded) return null

  return (
    <div className="admin-section">
      <div className="card sub">
        <h3>Stream Links</h3>
        <p className="hint muted">These links appear on the Streams tab for everyone.</p>
        {(['tiktok', 'twitch', 'youtube'] as const).map((k) => (
          <div className="row-grid" key={k} style={{ marginBottom: 10 }}>
            <label style={{ width: 80, textTransform: 'capitalize' }}>{k}</label>
            <input
              value={urls[k]}
              onChange={(e) => setUrls({ ...urls, [k]: e.target.value })}
              placeholder={`https://${k}.com/yourchannel`}
              style={{ flex: 1, minWidth: 240 }}
            />
          </div>
        ))}
        <button className="btn btn-primary btn-sm" onClick={save}>
          Save links
        </button>
      </div>
    </div>
  )
}

/* ---------------- Settings & Reset ---------------- */

function SettingsSection({
  teams,
  stats,
  games,
  refresh,
  toast,
}: {
  teams: Team[]
  stats: PlayerStat[]
  games: Game[]
  refresh: () => Promise<void>
  toast: (m: string) => void
}) {
  const [newCode, setNewCode] = useState('')
  const [busy, setBusy] = useState(false)

  const resetAll = async () => {
    if (!window.confirm('Reset ALL standings to 0-0 (week 1) and clear every player stat? This cannot be undone.')) return
    setBusy(true)
    const { error: e1 } = await supabase.from('teams').update({
      wins: 0,
      losses: 0,
      ties: 0,
      points_for: 0,
      points_against: 0,
      streak: '',
    })
    const { error: e2 } = await supabase.from('games').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error: e3 } = await supabase.from('player_stats').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error: e4 } = await supabase
      .from('playoff_slots')
      .update({ team1_id: null, team2_id: null, team1_score: null, team2_score: null, winner_id: null })
    const { error: e5 } = await supabase.from('app_settings').upsert({ key: 'current_week', value: '1' })
    setBusy(false)
    const err = e1?.message || e2?.message || e3?.message || e4?.message || e5?.message
    if (err) toast(err)
    else {
      toast('League reset: all records 0-0, stats cleared, week 1')
      await refresh()
    }
  }

  const resetRecords = async () => {
    if (!window.confirm('Reset all team records to 0-0? Stats and schedule stay.')) return
    const { error } = await supabase.from('teams').update({
      wins: 0,
      losses: 0,
      ties: 0,
      points_for: 0,
      points_against: 0,
      streak: '',
    })
    if (error) toast(error.message)
    else {
      toast('All records reset to 0-0')
      await refresh()
    }
  }

  const resetStats = async () => {
    if (!window.confirm('Delete ALL player stats? This cannot be undone.')) return
    const { error } = await supabase.from('player_stats').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) toast(error.message)
    else {
      toast('All player stats cleared')
      await refresh()
    }
  }

  const seedSchedule = async () => {
    if (!window.confirm('Generate a Week 1 schedule (16 games) from the current teams?')) return
    const shuffled = [...teams].sort(() => Math.random() - 0.5)
    const rows = []
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      rows.push({
        week: 1,
        home_team_id: shuffled[i].id,
        away_team_id: shuffled[i + 1].id,
        home_score: null,
        away_score: null,
        status: 'scheduled',
      })
    }
    const { error } = await supabase.from('games').insert(rows)
    if (error) toast(error.message)
    else {
      toast(`Week 1 schedule created (${rows.length} games, scores N/A)`)
      await refresh()
    }
  }

  const restoreTeams = async () => {
    const { error } = await supabase.from('teams').insert(DEFAULT_TEAMS)
    if (error) toast(error.message)
    else {
      toast('Default 32 NFL teams restored')
      await refresh()
    }
  }

  const saveCode = async () => {
    if (!newCode.trim()) return
    const { error } = await supabase.from('app_settings').upsert({
      key: 'admin_code',
      value: newCode.trim(),
      updated_at: new Date().toISOString(),
    })
    if (error) toast(error.message)
    else {
      toast('Admin code updated')
      setNewCode('')
    }
  }

  return (
    <div className="admin-section">
      <div className="card sub">
        <h3>Season Resets</h3>
        <p className="hint muted">
          Current data: {teams.length} teams, {games.length} games, {stats.length} stat lines.
        </p>
        <div className="row-grid">
          <button className="btn btn-ghost" onClick={resetRecords} disabled={busy}>
            Reset records to 0-0
          </button>
          <button className="btn btn-ghost" onClick={resetStats} disabled={busy}>
            Reset all player stats
          </button>
          <button className="btn btn-danger" onClick={resetAll} disabled={busy}>
            Full league reset (0-0, week 1, clear stats)
          </button>
        </div>
      </div>

      <div className="card sub">
        <h3>Schedule Tools</h3>
        <div className="row-grid">
          <button className="btn btn-ghost" onClick={seedSchedule}>
            Generate Week 1 schedule
          </button>
          <button className="btn btn-ghost" onClick={restoreTeams}>
            Restore default 32 NFL teams
          </button>
        </div>
      </div>

      <div className="card sub">
        <h3>Admin Code</h3>
        <p className="hint muted">Change the code used to enter admin mode. Default is ICFL2026 — change it now.</p>
        <div className="row-grid">
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="New admin code"
          />
          <button className="btn btn-primary btn-sm" onClick={saveCode}>
            Update code
          </button>
        </div>
      </div>
    </div>
  )
}
