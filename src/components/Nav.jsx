import { Link } from 'react-router-dom'
import config from '../config.js'

// Sticky, translucent nav (guide §3.1).
export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-content items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-ink">
          <span aria-hidden className="text-xl">🏛️</span>
          <span className="tracking-tight">{config.appName}</span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium text-text-muted">
          <a href="/#how-it-works" className="hover:text-ink">How it works</a>
          <Link to="/privacy" className="hover:text-ink">Privacy</Link>
          <Link to="/terms" className="hover:text-ink">Terms</Link>
          <a
            href={config.playStoreUrl}
            className="rounded-btn bg-blue px-4 py-2 font-semibold text-white transition hover:bg-blue-deep"
          >
            Get the app
          </a>
        </div>
      </nav>
    </header>
  )
}
