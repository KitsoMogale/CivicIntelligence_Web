import { Link } from 'react-router-dom'
import config from '../config.js'

// Footer with Legal / Support links on every page (guide §2, §3.9).
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line bg-surface-2">
      <div className="mx-auto grid max-w-content gap-8 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-2">
          <div className="flex items-center gap-2 font-extrabold text-ink">
            <span aria-hidden className="text-xl">🏛️</span>
            <span className="tracking-tight">{config.appName}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-text-muted">{config.tagline}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm text-text-muted">
            <li><Link to="/privacy" className="hover:text-ink">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-ink">Terms of Use</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Support</h3>
          <ul className="mt-3 space-y-2 text-sm text-text-muted">
            <li><Link to="/support" className="hover:text-ink">Support</Link></li>
            <li><Link to="/delete-account" className="hover:text-ink">Delete account</Link></li>
            <li><a href={`mailto:${config.contactEmail}`} className="hover:text-ink">{config.contactEmail}</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto max-w-content px-6 py-6 text-xs text-text-muted">
          © {year} {config.legalEntity || config.appName}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
