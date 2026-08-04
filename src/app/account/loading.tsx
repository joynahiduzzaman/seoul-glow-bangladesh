import { SkeletonBlock, SkeletonText } from "@/components/Skeleton";

export default function AccountLoading() {
  return (
    <div className="container-px mx-auto section-py">
      <SkeletonBlock className="h-8 w-48 mb-2" />
      <SkeletonText className="w-72 mb-10" />
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="hidden md:block space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-10 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-32 rounded-xl2" />
          ))}
        </div>
      </div>
    </div>
  );
}
