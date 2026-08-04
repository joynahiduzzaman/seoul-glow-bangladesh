import { SkeletonBlock, SkeletonText } from "@/components/Skeleton";

export default function OrdersLoading() {
  return (
    <div className="container-px mx-auto section-py">
      <SkeletonBlock className="h-8 w-40 mb-2" />
      <SkeletonText className="w-64 mb-8" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl2 border border-border-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-36" />
                <SkeletonText className="w-24" />
              </div>
              <SkeletonBlock className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <SkeletonBlock key={j} className="h-14 w-14 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
