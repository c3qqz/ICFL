import type { Team } from './types'

export function teamLogo(t: Team | undefined, size = 40) {
  if (!t) return null
  if (t.logo_url) {
    return (
      <img
        src={t.logo_url}
        alt={t.name}
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    )
  }
  return (
    <span style={{ fontSize: size * 0.7, lineHeight: 1 }} role="img" aria-label={t.name}>
      {t.emoji}
    </span>
  )
}
