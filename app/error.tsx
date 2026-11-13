"use client";
import Link from "next/link";
export default function WorkspaceError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="legal-shell">
      <span className="eyebrow">CIVIC INTELLIGENCE</span>
      <h1>The workspace needs a fresh start.</h1>
      <p>
        An unexpected error interrupted this exploration. Retry the view or
        reset its local navigation state.
      </p>
      <button className="outline-button" onClick={reset}>
        Retry workspace
      </button>
      <button
        className="outline-button"
        style={{ marginTop: 12 }}
        onClick={() => {
          localStorage.removeItem("civic-exploration-v1");
          window.location.href = "/";
        }}
      >
        Reset local exploration
      </button>
      <p>
        <Link href="/support">Get help</Link>
      </p>
    </main>
  );
}
