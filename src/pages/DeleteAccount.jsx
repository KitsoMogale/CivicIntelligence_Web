import config from '../config.js'

// Account & data deletion page (guide §7 — REQUIRED public URL for Google Play).
// Documents the app's in-app deletion (Account → Delete account, backed by the
// `deleteAccount` Cloud Function). Wording mirrors what that function does —
// keep the two in sync if the deletion policy ever changes (guide §7.3).
export default function DeleteAccount() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-4xl font-black tracking-tight text-ink">
        Delete your {config.appName} account
      </h1>
      <p className="mt-4 text-text-muted">
        You can permanently delete your account and personal data at any time,
        directly in the app. Deletion is immediate and can’t be undone.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">How to delete your account</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-text-muted">
          <li>Open the {config.appName} app.</li>
          <li>Go to the <strong className="text-text">Account</strong> tab.</li>
          <li>Tap <strong className="text-text">“Delete account”</strong>.</li>
          <li>Type <code className="rounded bg-surface-3 px-1.5 py-0.5 text-sm text-text">DELETE</code> to confirm.</li>
        </ol>
        <p className="mt-3 text-text-muted">Your account and data are removed right away.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">What gets deleted</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text-muted">
          <li>Your account and sign-in (Google or email/password).</li>
          <li>Your profile: name, email, and location verification (country/city).</li>
          <li>Your Local Lens posts and any photos or videos you uploaded.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">What gets anonymized</h2>
        <p className="mt-3 text-text-muted">
          {config.appName} is a collaborative knowledge base — articles and
          collections are written and improved by many people. To avoid erasing
          shared community knowledge:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-text-muted">
          <li>Articles and collections you wrote stay published, but your name is removed (shown as “Anonymous”).</li>
          <li>Your comments are removed and shown as “[deleted]”.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">Can’t access the app?</h2>
        <p className="mt-3 text-text-muted">
          If you can’t sign in to delete your account yourself, email{' '}
          <a
            href={`mailto:${config.contactEmail}`}
            className="font-semibold text-blue hover:text-blue-deep"
          >
            {config.contactEmail}
          </a>{' '}
          from the address on your account and we’ll delete it for you, typically
          within 30 days.
        </p>
      </section>
    </article>
  )
}
