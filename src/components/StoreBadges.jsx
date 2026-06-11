import config from '../config.js'

// Store badge placeholders (guide §3.2/§3.8).
// Swap the inner markup for the official App Store / Google Play badge SVGs
// (guide §11) when assets land — keep the links pointing at config URLs.
function Badge({ href, kicker, label, dark }) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-btn px-5 py-3 transition hover:opacity-90 ${
        dark ? 'bg-white text-ink' : 'bg-ink text-white'
      }`}
    >
      <span aria-hidden className="text-2xl">{kicker}</span>
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wide opacity-70">
          Download on the
        </span>
        <span className="block text-base font-semibold">{label}</span>
      </span>
    </a>
  )
}

export default function StoreBadges({ dark = false, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      <Badge href={config.appStoreUrl} kicker="" label="App Store" dark={dark} />
      <Badge href={config.playStoreUrl} kicker="▶" label="Google Play" dark={dark} />
    </div>
  )
}
