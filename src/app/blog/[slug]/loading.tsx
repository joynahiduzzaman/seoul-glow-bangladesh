import { SkeletonBlock, SkeletonText } from "@/components/Skeleton";

export default function BlogPostLoading() {
  return (
    <article className="container-px mx-auto section-py max-w-2xl">
      <SkeletonBlock className="h-4 w-24 mb-5" />
      <SkeletonBlock className="h-10 w-full mb-3" />
      <SkeletonBlock className="h-10 w-3/4 mb-6" />
      <SkeletonText className="w-48 mb-8" />
      <SkeletonBlock className="aspect-[16/9] rounded-xl2 mb-10" />
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonText key={i} className={i % 4 === 3 ? "w-2/3" : "w-full"} />
        ))}
      </div>
    </article>
  );
}
