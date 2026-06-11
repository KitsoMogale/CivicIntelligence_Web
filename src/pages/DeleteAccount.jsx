import config from '../config.js'

// Account & data deletion page (guide §7 — Google Play requires a web path).
export default function DeleteAccount() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-black tracking-tight text-ink">
        Delete your account &amp; data
      </h1>

      <p className="mt-4 text-text-muted">
        You can request deletion of your {config.appName} account and associated
        data at any time.
      </p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-xl font-bold text-ink">From inside the app</h2>
          <p className="mt-2 text-text-muted">{/* TODO: in-app steps if available. */}Steps to be documented.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">By email</h2>
          <p className="mt-2 text-text-muted">
            Email{' '}
            <a href={`mailto:${config.privacyEmail}`} className="font-semibold text-blue hover:text-blue-deep">
              {config.privacyEmail}
            </a>{' '}
            from your account address.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">What gets deleted</h2>
          <p className="mt-2 text-text-muted">
            Your account, profile, Local Lens uploads, and comments. Embedded
            community articles you co-authored may remain as part of the shared
            knowledge base (authorship may be anonymized).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">Timeframe</h2>
          <p className="mt-2 text-text-muted">We respond within 30 days.</p>
        </section>
      </div>
    </article>
  )
}
