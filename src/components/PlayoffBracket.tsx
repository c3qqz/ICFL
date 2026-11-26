import { teamLogo, type PlayoffSlot, type Team } from '../lib/types'
import { ROUNDS } from '../lib/types'

function MatchCard({
  slot,
  teams,
  compact,
}: {
  slot: PlayoffSlot
  teams: Team[]
  compact?: boolean
}) {
  const t1 = teams.find((t) => t.id === slot.team1_id)
  const t2 = teams.find((t) => t.id === slot.team2_id)
  const played = slot.team1_score !== null && slot.team2_score !== null
  const t1Won = played && slot.winner_id === slot.team1_id
  const t2Won = played && slot.winner_id === slot.team2_id

  const row = (t: Team | undefined, score: number | null, won: boolean) => (
    <div className={`match-team ${won ? 'winner' : ''}`}>
      <span className="team-line">
        {teamLogo(t, compact ? 20 : 26)}
        <span>{t?.abbreviation ?? 'TBD'}</span>
      </span>
      <span className="match-score">{played ? score : '-'}</span>
    </div>
  )

  return (
    <div className="match-card card">
      {row(t1, slot.team1_score, t1Won)}
      {row(t2, slot.team2_score, t2Won)}
      {!compact && (
        <div className="match-round muted">
          {slot.round}
          {slot.winner_id && (
            <span className="badge badge-gold champ">
              {teams.find((t) => t.id === slot.winner_id)?.abbreviation} advances
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function PlayoffBracket({
  slots,
  teams,
  compact = false,
}: {
  slots: PlayoffSlot[]
  teams: Team[]
  compact?: boolean
}) {
  if (!slots.length) {
    return (
      <p className="muted">
        Playoff bracket not set. League admin can seed teams in the Admin tab.
      </p>
    )
  }

  const byRound = ROUNDS.map((r) => ({
    round: r,
    slots: slots.filter((s) => s.round === r).sort((a, b) => a.slot_index - b.slot_index),
  }))

  if (compact) {
    return (
      <div className="bracket-compact">
        {byRound.map(
          ({ round, slots: rs }) =>
            rs[0] && <MatchCard key={round} slot={rs[0]} teams={teams} compact />,
        )}
        <style>{`
          .bracket-compact { display: flex; flex-direction: column; gap: 10px; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="container bracket-page">
      <h2 className="section-title">Playoff Bracket</h2>
      <p className="muted" style={{ marginTop: -10, marginBottom: 24 }}>
        Winners advance automatically — the bracket updates as scores are entered. Admin edits in the Admin tab.
      </p>
      <div className="bracket">
        {byRound.map(({ round, slots: rs }) => (
          <div key={round} className="bracket-col">
            <h3 className="round-title">{round}</h3>
            {rs.map((s) => (
              <MatchCard key={s.id} slot={s} teams={teams} />
            ))}
          </div>
        ))}
      </div>
      <style>{`
        .bracket-page { padding: 36px 20px 70px; flex: 1; }
        .bracket {
          display: grid;
          grid-template-columns: repeat(4, minmax(210px, 1fr));
          gap: 22px;
          overflow-x: auto;
          align-items: start;
          padding-bottom: 10px;
        }
        .bracket-col { display: flex; flex-direction: column; gap: 14px; }
        .round-title {
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.95rem;
          color: var(--gold-300);
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }
        .match-card { padding: 12px 14px; }
        .match-team {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 6px 4px;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }
        .match-team.winner { opacity: 1; }
        .match-team.winner .team-line { color: var(--gold-300); }
        .team-line { display: flex; align-items: center; gap: 8px; font-weight: 700; font-family: var(--font-display); font-size: 1.05rem; letter-spacing: 0.04em; }
        .match-score { font-weight: 800; font-family: var(--font-display); font-size: 1.1rem; }
        .match-round { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 0.75rem; }
        .champ { display: none; }
        @media (max-width: 900px) {
          .bracket { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
