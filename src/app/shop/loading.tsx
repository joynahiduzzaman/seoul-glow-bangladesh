export default function ShopLoading() {
  return (
    <div className="animate-pulse">
      <div className="bg-beige/50 border-b border-ink/5 py-12">
        <div className="container-px mx-auto text-center">
          <div className="h-9 w-56 bg-beige rounded mx-auto mb-3" />
          <div className="h-4 w-72 bg-beige rounded mx-auto" />
        </div>
      </div>
      <div className="border-b border-ink/5 py-4">
        <div className="container-px mx-auto flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-beige rounded-full shrink-0" />
          ))}
        </div>
      </div>
      <div className="container-px mx-auto py-10">
        <div className="grid md:grid-cols-[240px_1fr] gap-12">
          <div className="space-y-4 hidden md:block">
            <div className="h-40 bg-beige rounded-xl2" />
            <div className="h-40 bg-beige rounded-xl2" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[4/5] bg-beige rounded-xl2" />
                <div className="h-3 w-3/4 bg-beige rounded" />
                <div className="h-3 w-1/2 bg-beige rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
