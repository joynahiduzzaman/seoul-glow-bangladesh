/** Infinite CSS-scroll ticker — pure CSS animation, no JS cost. Duplicates its content
 * once so the loop is seamless; pauses on hover for readability. */
export default function Marquee({ items }: { items: string[] }) {
  const track = [...items, ...items];
  return (
    <div className="group overflow-hidden whitespace-nowrap">
      <div className="inline-flex animate-marquee group-hover:[animation-play-state:paused]">
        {track.map((item, i) => (
          <span key={i} className="mx-6 inline-flex items-center gap-2 text-xs tracking-wide">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
