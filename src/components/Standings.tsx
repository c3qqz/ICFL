import { teamLogo, type Team } from '../lib/types'

function pct(t: Team): string {
  const g = t.wins + t.losses + t.ties
  if (!g) return '.000'
  return (t.wins + t.ties * 0.5) / g === 1
    ? '1.000'
    : ((t.wins + t.ties * 0.5) / g).toFixed(3).replace(/^0/, '')
}

function diff(t: Team): number {
  return t.points_for - t.points_against
}

function sortTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    const pa = a.wins + a.ties * 0.5
    const pb = b.wins + b.ties * 0.5
    if (pb !== pa) return pb - pa
    return diff(b) - diff(a)
  })
}

export default function Standings({
  teams,
  compact = false,
  limit,
}: {
  teams: Team[]
  compact?: boolean
  limit?: number
}) {
  const sorted = sortTeams(teams)
  const shown = limit ? sorted.slice(0, limit) : sorted

  if (!teams.length) return <p className="muted">No teams yet. League admin can add teams in the Admin tab.</p>

  if (compact) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>W</th>
              <th>L</th>
              <th>T</th>
              <th>PCT</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id}>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {teamLogo(t, 22)} {t.abbreviation}
                  </span>
                </td>
                <td>{t.wins}</td>
                <td>{t.losses}</td>
                <td>{t.ties}</td>
                <td className="muted">{pct(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const afc = sortTeams(teams.filter((t) => t.conference === 'AFC'))
  const nfc = sortTeams(teams.filter((t) => t.conference !== 'AFC'))

  const confTable = (list: Team[], title: string) => (
    <div className="conf-block">
      <h3 className="conf-title">{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>W</th>
              <th>L</th>
              <th>T</th>
              <th>PCT</th>
              <th>PF</th>
              <th>PA</th>
              <th>DIFF</th>
              <th>Strk</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t, i) => (
              <tr key={t.id} className={i < 4 ? 'playoff-line' : ''}>
                <td className="muted">{i + 1}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {teamLogo(t, 24)} {t.name}
                  </span>
                </td>
                <td>{t.wins}</td>
                <td>{t.losses}</td>
                <td>{t.ties}</td>
                <td className="muted">{pct(t)}</td>
                <td className="muted">{t.points_for}</td>
                <td className="muted">{t.points_against}</td>
                <td className={diff(t) >= 0 ? 'pos' : 'neg'}>
                  {diff(t) > 0 ? '+' : ''}
                  {diff(t)}
                </td>
                <td className="muted">{t.streak || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="container standings-page">
      <h2 className="section-title">League Standings</h2>
      <p className="muted" style={{ marginTop: -10, marginBottom: 20 }}>
        Top 4 teams per conference (highlighted) make the playoffs.
      </p>
      {confTable(afc, 'AFC')}
      {confTable(nfc, 'NFC')}
      <style>{`
        .standings-page { padding: 36px 20px 70px; flex: 1; }
        .conf-block { margin-bottom: 30px; }
        .conf-title {
          font-size: 1.3rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--gold-300);
          margin-bottom: 10px;
        }
        .playoff-line td { background: rgba(212,160,23,0.045); }
        .pos { color: var(--green-500); }
        .neg { color: var(--red-500); }
      `}</style>
    </div>
  )
}
