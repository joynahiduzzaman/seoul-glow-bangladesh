/**
 * Shared skeleton primitives.
 *
 * Both use the `.skeleton` class from globals.css — a light sweep across a
 * neutral block rather than a pulsing opacity, which reads as "content is
 * arriving" instead of "something is broken".
 *
 * Server components by design: route-level loading.tsx files render before any
 * client JS has run, so a skeleton must never depend on hydration.
 */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-lg ${className}`} />;
}

/** A single line of placeholder text, sized to real body copy. */
export function SkeletonText({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton h-3 rounded ${className}`} />;
}

/** Product-card placeholder, matching ProductCard's real proportions so the
 * grid doesn't reflow when content swaps in. */
export function SkeletonProductCard() {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="aspect-[4/5] rounded-xl2" />
      <SkeletonText className="w-1/3" />
      <SkeletonText className="w-4/5" />
      <SkeletonText className="w-1/2" />
    </div>
  );
}
