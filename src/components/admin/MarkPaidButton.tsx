"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function MarkPaidButton({ commissionId }: { commissionId: string }) {
  const router = useRouter();

  async function handleClick() {
    const res = await fetch(`/api/admin/commissions/${commissionId}`, { method: "PATCH" });
    if (res.ok) {
      toast.success("Marked as paid");
      router.refresh();
    } else {
      toast.error("Failed to update commission");
    }
  }

  return (
    <button onClick={handleClick} className="text-xs text-rose-gold-text hover:underline">
      Mark Paid
    </button>
  );
}
