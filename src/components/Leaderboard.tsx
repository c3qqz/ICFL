import { useMemo, useState } from 'react'
import type { PlayerStat } from '../lib/types'

type Category = 'passing' | 'rushing' | 'receiving' | 'defense'

const COLUMNS: Record<Category, { key: keyof PlayerStat; label: string }[]> = {
  passing: [
    { key: 'passing_yards', label: 'Yds' },
    { key: 'passing_tds', label: 'TD' },
    { key: 'interceptions', label: 'INT' },
    { key: 'games_played', label: 'GP' },
  ],
  rushing: [
    { key: 'rushing_yards', label: 'Yds' },
    { key: 'rushing_tds', label: 'TD' },
    { key: 'games_played', label: 'GP' },
  ],
  receiving: [
    { key: 'receptions', label: 'Rec' },
    { key: 'receiving_yards', label: 'Yds' },
    { key: 'receiving_tds', label: 'TD' },
    { key: 'games_played', label: 'GP' },
  ],
  defense: [
    { key: 'tackles', label: 'Tkl' },
    { key: 'sacks', label: 'Sck' },
    { key: 'picks', label: 'INT' },
    { key: 'games_played', label: 'GP' },
  ],
}

function leaders(stats: PlayerStat[], cat: Category): PlayerStat[] {
  const primary: Record<Category, keyof PlayerStat> = {
    passing: 'passing_yards',
    rushing: 'rushing_yards',
    receiving: 'receiving_yards',
    defense: 'tackles',
  }
  return [...stats].sort((a, b) => Number(b[primary[cat]]) - Number(a[primary[cat]]))
}

export default function Leaderboard({
  stats,
  compact = false,
  category: fixedCat,
  limit,
}: {
  stats: PlayerStat[]
  compact?: boolean
  category?: Category
  limit?: number
}) {
  const [cat, setCat] = useState<Category>(fixedCat ?? 'passing')
  const rows = useMemo(() => {
    const l = leaders(stats, cat)
    return limit ? l.slice(0, limit) : l
  }, [stats, cat, limit])

  if (!stats.length) {
    return (
      <p className="muted">
        No stats recorded yet. League admin can import stats (CSV or Roblox webhook) in the Admin tab.
      </p>
    )
  }

  const cols = COLUMNS[cat]
  const primary = COLUMNS[cat][0].key

  return (
    <div>
      {!fixedCat && (
        <div className="cat-filter">
          {(Object.keys(COLUMNS) as Category[]).map((c) => (
            <button
              key={c}
              className={`btn btn-sm ${cat === c ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setCat(c)}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Team</th>
              {cols.map((c) => (
                <th key={String(c.key)}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.id}>
                <td className="muted">{i + 1}</td>
                <td>
                  <strong>{s.player_name}</strong>
                  {s.position && <span className="muted pos-tag"> {s.position}</span>}
                </td>
                <td className="muted">{s.team_name}</td>
                {cols.map((c) => (
                  <td key={String(c.key)} className={c.key === primary ? 'stat-lead' : ''}>
                    {String(s[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        .cat-filter { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
        .stat-lead { color: var(--gold-300); font-weight: 700; }
        .pos-tag { font-size: 0.78rem; margin-left: 6px; }
      `}</style>
    </div>
  )
}
