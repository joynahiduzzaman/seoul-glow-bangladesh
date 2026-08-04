export default function ProductLoading() {
  return (
    <div className="container-px mx-auto py-10 animate-pulse">
      <div className="grid md:grid-cols-2 gap-12">
        <div className="aspect-square bg-beige rounded-xl2" />
        <div className="space-y-4">
          <div className="h-3 w-24 bg-beige rounded" />
          <div className="h-8 w-3/4 bg-beige rounded" />
          <div className="h-6 w-1/3 bg-beige rounded" />
          <div className="h-24 bg-beige rounded" />
          <div className="h-10 w-1/2 bg-beige rounded-full" />
        </div>
      </div>
    </div>
  );
}
