import Link from "next/link";
import { type LucideIcon } from "lucide-react";

export default function DashboardEmptyState({
  icon: Icon,
  message,
  ctaLabel,
  ctaHref,
}: {
  icon: LucideIcon;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="text-center py-8">
      <Icon size={22} className="text-ink/20 mx-auto mb-3" />
      <p className="text-sm text-ink/70 mb-4">{message}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="link-tap text-sm text-rose-gold-text hover:underline font-medium">{ctaLabel}</Link>
      )}
    </div>
  );
}
