import { SkeletonBlock, SkeletonText } from "@/components/Skeleton";

export default function BlogLoading() {
  return (
    <div className="container-px mx-auto section-py">
      <div className="text-center mb-14">
        <SkeletonBlock className="h-4 w-28 mx-auto mb-4" />
        <SkeletonBlock className="h-9 w-72 mx-auto mb-3" />
        <SkeletonText className="w-96 mx-auto" />
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <SkeletonBlock className="aspect-[4/3] rounded-xl2" />
            <SkeletonBlock className="h-5 w-4/5" />
            <SkeletonText className="w-full" />
            <SkeletonText className="w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
