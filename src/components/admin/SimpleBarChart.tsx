import { formatBDT } from "@/lib/utils";

// Deliberately dependency-free (plain divs) rather than pulling in a charting
// library — this is a small admin sparkline, not an analytics product, and it
// means one less package that has to be installed for the dashboard to render.
//
// Previously drawn as an <svg> whose <rect> carried an SVG <title> built from
// several interpolated children plus an unpinned `value.toLocaleString()`. That
// combination hydrated inconsistently (the number formats against the server's
// locale during SSR and the browser's on the client), which is what produced
// the dashboard's "Hydration failed" errors. Everything rendered here now comes
// from props formatted by a single shared helper, so server and client agree.
export default function SimpleBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const hasAnyValue = data.some((d) => d.value > 0);

  return (
    <div>
      <div className="relative">
        {/* Horizontal guide lines give the bars something to sit against, so a
            single tall bar reads as a measurement rather than a stray block. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-px w-full bg-border-soft/70" />
          ))}
        </div>

        <div className="relative flex h-36 items-end gap-1.5 sm:gap-2">
          {data.map((d) => {
            const pct = (d.value / max) * 100;
            return (
              <div key={d.label} className="group/bar flex h-full flex-1 flex-col justify-end">
                <div
                  className="relative w-full rounded-t-md bg-gradient-to-t from-rose-gold/70 to-rose-gold transition-all duration-500 ease-silk group-hover/bar:from-rose-gold group-hover/bar:to-rose-gold-light"
                  // A zero-revenue day still gets a hairline, so it reads as
                  // "no sales that day" rather than as missing data.
                  style={{ height: d.value > 0 ? `max(${pct}%, 4px)` : "2px" }}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[10px] font-medium text-cream opacity-0 shadow-e2 transition-opacity duration-200 group-hover/bar:opacity-100">
                    {formatBDT(d.value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2.5 flex gap-1.5 sm:gap-2">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[10px] font-medium uppercase tracking-wide text-body">
            {d.label}
          </span>
        ))}
      </div>

      {!hasAnyValue && (
        <p className="mt-3 text-center text-xs text-ink/70">No revenue recorded in the last 7 days.</p>
      )}
    </div>
  );
}
