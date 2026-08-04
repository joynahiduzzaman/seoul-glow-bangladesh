import CompareClient from "@/components/CompareClient";

export const metadata = { title: "Compare Products" };

export default function ComparePage() {
  return (
    <div className="container-px mx-auto py-14 md:py-20">
      <div className="text-center mb-10 md:mb-12">
        <p className="eyebrow mb-2">Side by Side</p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink tracking-tight">Compare Products</h1>
        <p className="text-ink/70 mt-3 max-w-md mx-auto">
          Ingredients, texture, price, and stock — everything you need to pick the right one.
        </p>
      </div>
      <CompareClient />
    </div>
  );
}
