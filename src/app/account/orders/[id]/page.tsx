import { getCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { formatBDT } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: params.id }, { orderNumber: params.id }], userId: user.id },
    include: { items: true },
  });

  if (!order) return notFound();

  return (
    <div className="bg-white rounded-xl2 shadow-soft p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h2 className="font-display text-2xl">{order.orderNumber}</h2>
          <p className="text-sm text-ink/70">
            Placed on {new Date(order.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <span className="text-xs rounded-full px-3 py-1 font-medium bg-beige">{order.status}</span>
      </div>

      <div className="space-y-3 mb-6">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-4 border-b border-ink/5 pb-3">
            <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-beige shrink-0">
              {item.image && <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-ink/70">Qty {item.quantity}</p>
            </div>
            <span className="text-sm font-medium">{formatBDT(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="text-sm space-y-1">
          <h3 className="font-medium mb-2">Shipping Address</h3>
          <p className="text-ink/70">{order.shippingName}</p>
          <p className="text-ink/70">{order.shippingStreet}, {order.shippingArea}</p>
          <p className="text-ink/70">{order.shippingDistrict}</p>
          <p className="text-ink/70">{order.shippingPhone}</p>
        </div>
        <div className="text-sm space-y-2">
          <h3 className="font-medium mb-2">Payment Summary</h3>
          <div className="flex justify-between"><span className="text-ink/70">Subtotal</span><span>{formatBDT(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-rose-gold"><span>Discount</span><span>-{formatBDT(order.discount)}</span></div>}
          <div className="flex justify-between"><span className="text-ink/70">Shipping</span><span>{formatBDT(order.shippingFee)}</span></div>
          <div className="flex justify-between font-semibold border-t border-ink/10 pt-2"><span>Total</span><span>{formatBDT(order.total)}</span></div>
          <p className="text-ink/70 text-xs pt-1">Paid via {order.paymentMethod} · {order.paymentStatus}</p>
        </div>
      </div>

      <Link href="/account/orders" className="inline-block mt-6 text-sm text-rose-gold-text hover:underline">← Back to orders</Link>
    </div>
  );
}
