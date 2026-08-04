import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import ProductCard from "@/components/ProductCard";
import DashboardEmptyState from "@/components/account/DashboardEmptyState";
import { Heart } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Wishlist" };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  // Defensive only — the /account layout already redirects unauthenticated
  // visitors before this page ever renders.
  if (!user) redirect("/login?redirect=/account/wishlist");

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    include: { product: { include: { brand: { select: { name: true, slug: true } } } } },
  });

  if (items.length === 0) {
    return <DashboardEmptyState icon={Heart} message="Your wishlist is empty — save products you love to find them here later." ctaLabel="Browse Products" ctaHref="/shop" />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {items.map((i) => <ProductCard key={i.id} product={i.product as any} />)}
    </div>
  );
}
