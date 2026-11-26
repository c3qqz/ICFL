import { useMemo, useState } from 'react'
import { teamLogo, type Game, type Team } from '../lib/types'

export default function Schedule({
  games,
  teams,
  compact = false,
  limit,
}: {
  games: Game[]
  teams: Team[]
  compact?: boolean
  limit?: number
}) {
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
  const weeks = useMemo(
    () => [...new Set(games.map((g) => g.week))].sort((a, b) => a - b),
    [games],
  )
  const [week, setWeek] = useState<number | 'all'>('all')

  const shown = useMemo(() => {
    let list = week === 'all' ? games : games.filter((g) => g.week === week)
    if (limit) list = list.slice(-limit)
    return list
  }, [games, week, limit])

  if (!games.length) {
    return (
      <p className="muted">
        No games scheduled yet. League admin can add the weekly schedule in the Admin tab.
      </p>
    )
  }

  const gameRow = (g: Game) => {
    const home = g.home_team_id ? teamById.get(g.home_team_id) : undefined
    const away = g.away_team_id ? teamById.get(g.away_team_id) : undefined
    const played = g.status === 'final' && g.home_score !== null && g.away_score !== null
    return (
      <div key={g.id} className="game-card card">
        <div className="game-team">
          {teamLogo(away, 30)}
          <span>{away?.abbreviation ?? 'TBD'}</span>
        </div>
        <div className="game-mid">
          {played ? (
            <span className="score">
              {g.away_score} <em>-</em> {g.home_score}
            </span>
          ) : (
            <span className="score na">N/A</span>
          )}
          <span className={`badge ${played ? 'badge-green' : 'badge-gold'}`}>
            {played ? 'Final' : g.status === 'in_progress' ? 'Live' : 'Scheduled'}
          </span>
          <span className="muted week-tag">Wk {g.week}</span>
        </div>
        <div className="game-team">
          {teamLogo(home, 30)}
          <span>{home?.abbreviation ?? 'TBD'}</span>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="game-list">
        {shown.length ? shown.map(gameRow) : <p className="muted">No games yet.</p>}
        <style>{`
          .game-list { display: flex; flex-direction: column; gap: 10px; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="container schedule-page">
      <h2 className="section-title">Schedule &amp; Scores</h2>
      <div className="week-filter">
        <button
          className={`btn btn-sm ${week === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setWeek('all')}
        >
          All
        </button>
        {weeks.map((w) => (
          <button
            key={w}
            className={`btn btn-sm ${week === w ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setWeek(w)}
          >
            Week {w}
          </button>
        ))}
      </div>
      <div className="game-list">
        {shown.length ? shown.map(gameRow) : <p className="muted">No games for this week.</p>}
      </div>
      <style>{`
        .schedule-page { padding: 36px 20px 70px; flex: 1; }
        .week-filter { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 22px; }
        .game-list { display: flex; flex-direction: column; gap: 12px; max-width: 620px; }
        .game-card {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .game-card:hover { transform: translateY(-2px); border-color: rgba(212,160,23,0.35); }
        .game-team { display: flex; align-items: center; gap: 10px; font-weight: 700; font-family: var(--font-display); font-size: 1.15rem; letter-spacing: 0.04em; }
        .game-team:last-child { justify-content: flex-end; }
        .game-mid { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .score { font-family: var(--font-display); font-weight: 800; font-size: 1.3rem; }
        .score em { color: var(--muted); font-style: normal; }
        .score.na { color: var(--muted); font-weight: 600; }
        .week-tag { font-size: 0.72rem; }
        @media (max-width: 560px) {
          .game-card { grid-template-columns: 1fr; text-align: center; }
          .game-team:last-child { justify-content: center; }
          .game-team { justify-content: center; }
        }
      `}</style>
    </div>
  )
}
