import { Link } from 'react-router-dom'

// Shared shell + renderer for the legal pages (guide §6/§8).
//
// Pages pass a `sections` array. Each section: { heading, blocks[] }.
// Each block is one of:
//   { p: "paragraph text" }              — a paragraph
//   { list: ["item", ...] }              — a bullet list
//   { sub: "Sub-heading" }               — a minor heading
//   { note: "callout text" }             — an emphasized callout
// Strings may contain {appName}, {privacyEmail}, {contactEmail},
// {legalEntity}, {governingLaw}, {minAge} tokens, interpolated from `vars`.
function interpolate(text, vars) {
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

function Block({ block, vars }) {
  if (block.sub) {
    return <h3 className="mt-6 text-base font-semibold text-ink">{interpolate(block.sub, vars)}</h3>
  }
  if (block.note) {
    return (
      <p className="mt-4 rounded-card border border-blue/30 bg-blue-tint px-4 py-3 text-sm text-text">
        {interpolate(block.note, vars)}
      </p>
    )
  }
  if (block.list) {
    return (
      <ul className="mt-3 list-disc space-y-2 pl-5 text-text-muted">
        {block.list.map((item, i) => (
          <li key={i}>{interpolate(item, vars)}</li>
        ))}
      </ul>
    )
  }
  return <p className="mt-3 text-text-muted">{interpolate(block.p, vars)}</p>
}

export default function LegalPage({ title, intro, sections, lastUpdated, vars, crossLink }) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-black tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm text-text-muted">Last updated: {lastUpdated}</p>

      {intro && <p className="mt-8 text-lg text-text">{interpolate(intro, vars)}</p>}

      <div className="mt-8 space-y-10">
        {sections.map((section, i) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold text-ink">
              {i + 1}. {section.heading}
            </h2>
            {section.blocks.map((block, j) => (
              <Block key={j} block={block} vars={vars} />
            ))}
          </section>
        ))}
      </div>

      {crossLink && (
        <p className="mt-12 border-t border-line pt-6 text-sm text-text-muted">
          {crossLink.text}{' '}
          <Link to={crossLink.to} className="font-semibold text-blue hover:text-blue-deep">
            {crossLink.label}
          </Link>
          .
        </p>
      )}
    </article>
  )
}
