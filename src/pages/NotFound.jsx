import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="mx-auto max-w-content px-6 py-24 text-center">
      <h1 className="text-5xl font-black tracking-tight text-ink">404</h1>
      <p className="mt-4 text-text-muted">This page doesn't exist.</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-btn bg-blue px-6 py-3 font-semibold text-white transition hover:bg-blue-deep"
      >
        Back home
      </Link>
    </section>
  )
}
