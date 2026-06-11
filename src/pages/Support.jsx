import config from '../config.js'

// Support / Contact page (guide §2.4).
export default function Support() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-black tracking-tight text-ink">Support</h1>
      <p className="mt-4 text-text-muted">
        Need help with {config.appName}? Email us and we'll get back to you.
      </p>
      <a
        href={`mailto:${config.contactEmail}`}
        className="mt-6 inline-block rounded-btn bg-blue px-6 py-3 font-semibold text-white transition hover:bg-blue-deep"
      >
        {config.contactEmail}
      </a>
      {/* TODO: FAQ section (guide §2.4). */}
    </article>
  )
}
