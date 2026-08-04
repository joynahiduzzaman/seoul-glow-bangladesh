// Shown while any /admin route's server component is fetching data — Next.js
// picks this up automatically for the whole /admin segment.
export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-beige/70 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-xl2 shadow-soft" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="h-72 bg-white rounded-xl2 shadow-soft" />
        <div className="h-72 bg-white rounded-xl2 shadow-soft" />
      </div>
    </div>
  );
}
