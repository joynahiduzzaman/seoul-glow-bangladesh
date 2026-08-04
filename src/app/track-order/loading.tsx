import { SkeletonBlock, SkeletonText } from "@/components/Skeleton";

export default function TrackOrderLoading() {
  return (
    <div className="container-px mx-auto py-14 md:py-20 max-w-3xl">
      <div className="text-center mb-10">
        <SkeletonBlock className="h-14 w-14 rounded-full mx-auto mb-5" />
        <SkeletonBlock className="h-4 w-32 mx-auto mb-3" />
        <SkeletonBlock className="h-9 w-64 mx-auto mb-3" />
        <SkeletonText className="w-80 mx-auto" />
      </div>
      <div className="rounded-xl2 bg-white shadow-e2 p-6 space-y-4">
        <SkeletonBlock className="h-11 rounded-xl" />
        <SkeletonBlock className="h-11 rounded-xl" />
        <SkeletonBlock className="h-12 rounded-xl" />
      </div>
    </div>
  );
}
