import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, ADMIN_CODE_KEY } from './lib/supabase'
import { teamLogo, type Game, type PlayerStat, type PlayoffSlot, type Team } from './lib/types'
import Standings from './components/Standings'
import Schedule from './components/Schedule'
import Leaderboard from './components/Leaderboard'
import PlayoffBracket from './components/PlayoffBracket'
import Streams from './components/Streams'
import AdminPanel from './components/AdminPanel'

const TABS = ['Home', 'Standings', 'Schedule', 'Stats', 'Playoffs', 'Streams', 'Admin'] as const
type Tab = (typeof TABS)[number]

export function useLeagueData() {
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [stats, setStats] = useState<PlayerStat[]>([])
  const [slots, setSlots] = useState<PlayoffSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const [t, g, s, p] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('games').select('*').order('week').order('id'),
      supabase.from('player_stats').select('*').order('passing_yards', { ascending: false }),
      supabase.from('playoff_slots').select('*').order('slot_index'),
    ])
    if (t.error || g.error || s.error || p.error) {
      setError(t.error?.message || g.error?.message || s.error?.message || p.error?.message || 'Failed to load')
    } else {
      setTeams(t.data as Team[])
      setGames(g.data as Game[])
      setStats(s.data as PlayerStat[])
      setSlots(p.data as PlayoffSlot[])
      setError('')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { teams, games, stats, slots, loading, error, refresh }
}

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    setIsAdmin(sessionStorage.getItem(ADMIN_CODE_KEY) === '1')
  }, [])
  const signIn = () => {
    sessionStorage.setItem(ADMIN_CODE_KEY, '1')
    setIsAdmin(true)
  }
  const signOut = () => {
    sessionStorage.removeItem(ADMIN_CODE_KEY)
    setIsAdmin(false)
  }
  return { isAdmin, signIn, signOut }
}

export function useToast() {
  const [msg, setMsg] = useState('')
  const toast = useCallback((m: string) => {
    setMsg(m)
    window.clearTimeout((toast as unknown as { t?: number }).t)
    ;(toast as unknown as { t?: number }).t = window.setTimeout(() => setMsg(''), 3500)
  }, [])
  const node = msg ? <div className="toast">{msg}</div> : null
  return { toast, node }
}

function Hero({ teams }: { teams: Team[] }) {
  return (
    <header className="hero">
      <div className="hero-inner container">
        <div className="hero-badge">Roblox Ultimate Football League</div>
        <h1>
          <span className="hero-icfl">ICFL</span> LEAGUE
        </h1>
        <p className="hero-sub">
          The premier competitive Roblox ultimate football experience — standings, live scores,
          player leaderboards and a road to the ICFL Bowl.
        </p>
        <div className="hero-teams">
          {teams.slice(0, 16).map((t) => (
            <span key={t.id} className="hero-team" title={t.name}>
              {teamLogo(t, 26)}
            </span>
          ))}
          {teams.length > 16 && <span className="hero-team muted">+{teams.length - 16} more</span>}
        </div>
        <div className="hero-stats">
          <div>
            <strong>{teams.length}</strong>
            <span>Teams</span>
          </div>
          <div>
            <strong>32</strong>
            <span>Franchises</span>
          </div>
          <div>
            <strong>1</strong>
            <span>ICFL Bowl</span>
          </div>
        </div>
      </div>
      <style>{`
        .hero {
          position: relative;
          padding: 90px 0 70px;
          background:
            radial-gradient(ellipse 60% 80% at 50% 0%, rgba(212,160,23,0.12), transparent),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0 2px, transparent 2px 120px),
            linear-gradient(180deg, #0c1830 0%, var(--navy-950) 100%);
          border-bottom: 1px solid var(--border);
          overflow: hidden;
        }
        .hero::after {
          content: '';
          position: absolute;
          inset: auto 0 -1px 0;
          height: 6px;
          background: linear-gradient(90deg, transparent, var(--gold-500), transparent);
        }
        .hero-inner { text-align: center; position: relative; }
        .hero-badge {
          display: inline-block;
          font-size: 0.75rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--gold-300);
          border: 1px solid rgba(212,160,23,0.4);
          border-radius: 999px;
          padding: 6px 16px;
          margin-bottom: 18px;
          background: rgba(212,160,23,0.08);
        }
        .hero h1 {
          font-size: clamp(3.2rem, 9vw, 6.5rem);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          line-height: 1;
        }
        .hero-icfl {
          background: linear-gradient(180deg, var(--gold-300), var(--gold-500));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 0 40px rgba(212,160,23,0.3);
        }
        .hero-sub {
          max-width: 620px;
          margin: 14px auto 0;
          color: var(--muted);
          font-size: 1.02rem;
        }
        .hero-teams {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin: 30px auto 0;
          max-width: 700px;
        }
        .hero-team {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .hero-team:hover { transform: translateY(-3px); background: rgba(255,255,255,0.1); }
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 48px;
          margin-top: 36px;
        }
        .hero-stats div { display: flex; flex-direction: column; }
        .hero-stats strong {
          font-family: var(--font-display);
          font-size: 2rem;
          color: var(--gold-300);
        }
        .hero-stats span {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--muted);
        }
        @media (max-width: 640px) {
          .hero { padding: 60px 0 50px; }
          .hero-stats { gap: 28px; }
        }
      `}</style>
    </header>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('Home')
  const data = useLeagueData()
  const admin = useAdmin()
  const { toast, node: toastNode } = useToast()

  const navItems = useMemo(() => TABS.map((t) => ({ id: t, label: t })), [])

  return (
    <div>
      <nav className="topnav">
        <div className="container nav-inner">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setTab('Home')
            }}
          >
            <span className="brand-mark">ICFL</span>
            <span className="brand-sub">Ultimate Football League</span>
          </a>
          <div className="nav-links">
            {navItems.map((n) => (
              <button
                key={n.id}
                className={`nav-link ${tab === n.id ? 'active' : ''}`}
                onClick={() => setTab(n.id)}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
      <style>{`
        .topnav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(6, 11, 22, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }
        .nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 62px;
          gap: 16px;
        }
        .brand { display: flex; align-items: baseline; gap: 10px; }
        .brand-mark {
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 1.7rem;
          letter-spacing: 0.05em;
          background: linear-gradient(180deg, var(--gold-300), var(--gold-500));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .brand-sub {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: var(--muted);
        }
        .nav-links { display: flex; gap: 4px; overflow-x: auto; }
        .nav-link {
          background: none;
          border: none;
          color: var(--muted);
          font-weight: 600;
          font-size: 0.88rem;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease;
          white-space: nowrap;
        }
        .nav-link:hover { color: var(--white); background: rgba(255,255,255,0.06); }
        .nav-link.active { color: var(--gold-300); background: rgba(212,160,23,0.12); }
        @media (max-width: 720px) {
          .brand-sub { display: none; }
          .nav-inner { flex-direction: column; height: auto; padding: 10px 0; gap: 6px; }
        }
      `}</style>

      {tab === 'Home' && (
        <>
          <Hero teams={data.teams} />
          <main className="container home-main">
            <div className="home-grid">
              <section className="card home-card">
                <h3>Top of the Standings</h3>
                <Standings teams={data.teams} compact limit={8} />
              </section>
              <section className="card home-card">
                <h3>Passing Leaders</h3>
                <Leaderboard stats={data.stats} compact category="passing" limit={6} />
              </section>
              <section className="card home-card">
                <h3>Recent Scores</h3>
                <Schedule games={data.games} teams={data.teams} compact limit={6} />
              </section>
              <section className="card home-card">
                <h3>Road to the ICFL Bowl</h3>
                <PlayoffBracket slots={data.slots} teams={data.teams} compact />
              </section>
            </div>
          </main>
          <style>{`
            .home-main { padding: 36px 20px 70px; flex: 1; }
            .home-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
              gap: 20px;
            }
            .home-card { padding: 22px; }
            .home-card h3 {
              font-size: 1.2rem;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              margin-bottom: 14px;
              color: var(--gold-300);
            }
          `}</style>
        </>
      )}

      {tab === 'Standings' && <Standings teams={data.teams} />}
      {tab === 'Schedule' && <Schedule games={data.games} teams={data.teams} />}
      {tab === 'Stats' && <Leaderboard stats={data.stats} />}
      {tab === 'Playoffs' && <PlayoffBracket slots={data.slots} teams={data.teams} />}
      {tab === 'Streams' && <Streams />}
      {tab === 'Admin' && (
        <AdminPanel
          isAdmin={admin.isAdmin}
          onSignIn={admin.signIn}
          onSignOut={admin.signOut}
          data={data}
          toast={toast}
        />
      )}

      {toastNode}
      {data.error && (
        <div className="container" style={{ padding: '20px', color: 'var(--red-500)' }}>
          Database error: {data.error}
        </div>
      )}
      {data.loading && (
        <div className="container muted" style={{ padding: '40px', textAlign: 'center' }}>
          Loading league data...
        </div>
      )}
    </div>
  )
}
