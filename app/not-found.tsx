import Link from "next/link";
export default function NotFound() {
  return (
    <main className="legal-shell">
      <span className="eyebrow">CIVIC INTELLIGENCE</span>
      <h1>A little off the map.</h1>
      <p>This page does not exist.</p>
      <Link href="/">Return to the workspace →</Link>
    </main>
  );
}
