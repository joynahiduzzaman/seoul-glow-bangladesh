import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ManualOrderForm from "@/components/admin/ManualOrderForm";

export const metadata = { title: "New Order" };

export default function NewManualOrderPage() {
  return (
    <div>
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-xs text-ink/70 hover:text-ink mb-4">
        <ArrowLeft size={13} /> Back to Orders
      </Link>
      <h1 className="font-display text-3xl font-semibold mb-1">New Order</h1>
      <p className="text-sm text-ink/70 mb-6">Record a phone, Messenger, or walk-in order — priced and stocked exactly like a real checkout.</p>
      <ManualOrderForm />
    </div>
  );
}
