import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PLATFORMS = [
  {
    key: 'tiktok',
    label: 'TikTok',
    color: '#ff0050',
    placeholder: 'https://tiktok.com/@yourleague',
    hint: 'Paste your TikTok live or profile URL',
  },
  {
    key: 'twitch',
    label: 'Twitch',
    color: '#9146ff',
    placeholder: 'https://twitch.tv/yourleague',
    hint: 'Paste your Twitch channel URL',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    color: '#ff0000',
    placeholder: 'https://youtube.com/@yourleague',
    hint: 'Paste your YouTube channel or stream URL',
  },
]

export default function Streams() {
  const [urls, setUrls] = useState<Record<string, string>>({
    tiktok: '',
    twitch: '',
    youtube: '',
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
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

  if (!loaded) return <p className="muted container" style={{ padding: 40 }}>Loading streams...</p>

  const cards = PLATFORMS.map((p) => ({
    ...p,
    url: urls[p.key],
  }))

  return (
    <div className="container streams-page">
      <h2 className="section-title">Watch Live</h2>
      <p className="muted" style={{ marginTop: -10, marginBottom: 28 }}>
        Catch ICFL games live on TikTok, Twitch and YouTube. League admin sets the channel links in the Admin tab.
      </p>
      <div className="stream-grid">
        {cards.map((p) => (
          <a
            key={p.key}
            href={p.url || undefined}
            target="_blank"
            rel="noreferrer"
            className={`stream-card card ${p.url ? '' : 'disabled'}`}
            style={{ '--accent': p.color } as React.CSSProperties}
            onClick={(e) => !p.url && e.preventDefault()}
          >
            <div className="stream-icon" style={{ background: p.color }}>
              {p.key === 'tiktok' && <TikTokIcon />}
              {p.key === 'twitch' && <TwitchIcon />}
              {p.key === 'youtube' && <YouTubeIcon />}
            </div>
            <h3>{p.label}</h3>
            {p.url ? (
              <span className="badge badge-green">Live / Available</span>
            ) : (
              <span className="badge badge-gold">Link not set</span>
            )}
            <p className="muted">{p.url || p.hint}</p>
          </a>
        ))}
      </div>
      <style>{`
        .streams-page { padding: 36px 20px 70px; flex: 1; }
        .stream-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
          max-width: 980px;
        }
        .stream-card {
          padding: 28px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          transition: transform 0.18s ease, border-color 0.18s ease;
        }
        .stream-card:not(.disabled):hover {
          transform: translateY(-4px);
          border-color: var(--accent);
        }
        .stream-card.disabled { opacity: 0.55; cursor: default; }
        .stream-icon {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .stream-card h3 { font-size: 1.4rem; text-transform: uppercase; letter-spacing: 0.06em; }
        .stream-card p { font-size: 0.8rem; word-break: break-all; margin: 0; }
      `}</style>
    </div>
  )
}

function TikTokIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

function TwitchIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0 1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12z" />
    </svg>
  )
}
