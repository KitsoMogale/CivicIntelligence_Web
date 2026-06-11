import config, { features, steps, categories, trust } from '../config.js'
import StoreBadges from '../components/StoreBadges.jsx'
import PhoneMockup from '../components/PhoneMockup.jsx'

// Landing page — all sections in order, guide §3.
export default function Home() {
  return (
    <>
      {/* §3.2 — Hero */}
      <section className="mx-auto grid max-w-content items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-ink sm:text-6xl">
            {config.tagline}
          </h1>
          <p className="mt-6 max-w-md text-lg text-text-muted">
            Collaborative, verified, plain-language civic knowledge — written and
            reviewed by the people who live it.
          </p>
          <StoreBadges className="mt-8" />
          <p className="mt-4 text-sm text-text-muted">
            Free · Verified locals · Community-reviewed.
          </p>
        </div>
        <div className="order-first md:order-last">
          <PhoneMockup />
        </div>
      </section>

      {/* §3.3 — What it is */}
      <section className="bg-surface-2">
        <div className="mx-auto max-w-content px-6 py-20">
          <h2 className="text-center text-3xl font-extrabold text-ink sm:text-4xl">
            Civic knowledge, built together
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-card border border-line bg-white p-6">
                <div aria-hidden className="text-3xl">{f.icon}</div>
                <h3 className="mt-4 text-base font-bold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* §3.4 — How it works */}
      <section id="how-it-works" className="mx-auto max-w-content px-6 py-20">
        <h2 className="text-center text-3xl font-extrabold text-ink sm:text-4xl">
          How it works
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-card border border-line p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue text-lg font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* §3.5 — Categories strip */}
      <section className="bg-surface-2">
        <div className="mx-auto max-w-content px-6 py-16">
          <h2 className="text-center text-2xl font-extrabold text-ink">
            What you'll find inside
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {categories.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-text"
              >
                <span aria-hidden>{c.icon}</span>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* §3.6 — Local Lens showcase */}
      <section className="mx-auto max-w-content px-6 py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-blue-tint px-3 py-1 text-xs font-semibold text-blue-deep">
              Local Lens
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-ink">
              A visual census of the country
            </h2>
            <p className="mt-3 max-w-md text-text-muted">
              Locals post photos and video documenting things on the ground — at
              country and city level. A living, visual layer over the knowledge base.
            </p>
          </div>
          {/* Placeholder gallery — swap for real Local Lens imagery (with consent). */}
          <div className="grid grid-cols-3 gap-3">
            {['🏙️', '🚌', '🏥', '🏞️', '🏫', '🛣️'].map((e, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-card bg-surface-2 text-3xl"
              >
                <span aria-hidden>{e}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* §3.7 — Trust & safety */}
      <section className="bg-surface-2">
        <div className="mx-auto max-w-content px-6 py-20">
          <h2 className="text-center text-3xl font-extrabold text-ink sm:text-4xl">
            Built to be trusted
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((t) => (
              <div key={t.title} className="rounded-card border border-line bg-white p-6">
                <div aria-hidden className="text-2xl">{t.icon}</div>
                <h3 className="mt-3 text-base font-bold text-ink">{t.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* §3.8 — Final CTA band */}
      <section className="bg-blue">
        <div className="mx-auto flex max-w-content flex-col items-center gap-6 px-6 py-16 text-center">
          <h2 className="max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
            Understand your country. Help others do the same.
          </h2>
          <StoreBadges dark />
        </div>
      </section>
    </>
  )
}
