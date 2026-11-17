import type { Citation } from "@/lib/teaching";
export default function CitedText({
  text,
  citations = [],
}: {
  text: string;
  citations?: Citation[];
}) {
  const parts = [],
    sorted = [...citations].sort((a, b) => a.start - b.start);
  let offset = 0;
  for (const [i, c] of sorted.entries()) {
    if (c.start < offset || c.end < c.start || c.end > text.length) continue;
    parts.push(<span key={"text-" + i}>{text.slice(offset, c.start)}</span>);
    parts.push(
      <a
        className="inline-citation"
        key={"cite-" + i}
        href={c.url}
        title={c.title}
        target="_blank"
        rel="noreferrer"
      >
        [{i + 1}]
      </a>,
    );
    offset = c.end;
  }
  parts.push(<span key="last">{text.slice(offset)}</span>);
  return <>{parts}</>;
}
