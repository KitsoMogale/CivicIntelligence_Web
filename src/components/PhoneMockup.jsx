// Phone mockup placeholder (guide §3.2).
// Replace the inner screen content with a real app screenshot
// (home / article / Local Lens) in a device frame — guide §11.
export default function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[260px]">
      <div className="rounded-[2.5rem] border border-line bg-ink p-3 shadow-xl shadow-black/10">
        <div className="overflow-hidden rounded-[2rem] bg-white">
          {/* Faux status bar */}
          <div className="flex items-center justify-between bg-surface-2 px-5 py-2 text-[10px] text-text-muted">
            <span>9:41</span>
            <span aria-hidden>● ● ●</span>
          </div>

          {/* Faux app content */}
          <div className="space-y-3 px-4 py-5">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-lg">🏛️</span>
              <div className="h-3 w-24 rounded bg-surface-3" />
            </div>
            <div className="rounded-card border border-line p-3">
              <div className="mb-2 inline-block rounded-full bg-green/15 px-2 py-0.5 text-[10px] font-semibold text-green-deep">
                Embedded
              </div>
              <div className="h-2.5 w-3/4 rounded bg-surface-3" />
              <div className="mt-1.5 h-2 w-full rounded bg-line" />
              <div className="mt-1.5 h-2 w-5/6 rounded bg-line" />
            </div>
            <div className="rounded-card border border-line p-3">
              <div className="mb-2 inline-block rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold text-amber">
                Under review
              </div>
              <div className="h-2.5 w-2/3 rounded bg-surface-3" />
              <div className="mt-1.5 h-2 w-full rounded bg-line" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['🏥', '⚖️', '⚡'].map((e) => (
                <div key={e} className="flex aspect-square items-center justify-center rounded-card bg-surface-2 text-xl">
                  <span aria-hidden>{e}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
