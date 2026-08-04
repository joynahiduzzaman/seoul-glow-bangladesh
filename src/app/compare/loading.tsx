import { SkeletonBlock, SkeletonText } from "@/components/Skeleton";

export default function CompareLoading() {
  return (
    <div className="container-px mx-auto section-py">
      <SkeletonBlock className="h-8 w-56 mb-2" />
      <SkeletonText className="w-80 mb-10" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <SkeletonBlock className="aspect-square rounded-xl2" />
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonText className="w-1/2" />
            {Array.from({ length: 6 }).map((_, j) => (
              <SkeletonText key={j} className="w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
