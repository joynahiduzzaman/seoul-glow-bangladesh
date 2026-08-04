const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-ink/10 text-ink/70",
  PENDING: "bg-gold/15 text-gold",
  CONFIRMED: "bg-rose-gold/10 text-rose-gold",
  PACKED: "bg-badge-coupon/10 text-badge-coupon",
  SHIPPED: "bg-olive/10 text-olive",
  DELIVERED: "bg-success/10 text-success",
  CANCELLED: "bg-badge-sale/10 text-badge-sale",
  RETURNED: "bg-badge-onetwo/10 text-badge-onetwo",
  REFUNDED: "bg-ink/10 text-ink/70",
};

const PAYMENT_STYLES: Record<string, string> = {
  PENDING: "bg-gold/15 text-gold",
  PAID: "bg-success/10 text-success",
  PARTIAL: "bg-badge-coupon/10 text-badge-coupon",
  FAILED: "bg-badge-sale/10 text-badge-sale",
  REFUNDED: "bg-ink/10 text-ink/70",
};

const VERIFICATION_STYLES: Record<string, string> = {
  UNVERIFIED: "bg-gold/15 text-gold",
  VERIFIED: "bg-success/10 text-success",
  REJECTED: "bg-badge-sale/10 text-badge-sale",
};

const DELIVERY_STYLES: Record<string, string> = {
  PENDING: "bg-ink/10 text-ink/70",
  PICKED_UP: "bg-gold/15 text-gold",
  IN_TRANSIT: "bg-olive/10 text-olive",
  OUT_FOR_DELIVERY: "bg-rose-gold/10 text-rose-gold",
  DELIVERED: "bg-success/10 text-success",
  FAILED: "bg-badge-sale/10 text-badge-sale",
  RETURNED: "bg-badge-onetwo/10 text-badge-onetwo",
};

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export function OrderStatusBadge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 whitespace-nowrap ${STATUS_STYLES[status] || "bg-ink/10 text-ink/70"} ${className}`}>
      {titleCase(status)}
    </span>
  );
}

export function PaymentStatusBadge({ status, method, className = "" }: { status: string; method?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 whitespace-nowrap ${PAYMENT_STYLES[status] || "bg-ink/10 text-ink/70"} ${className}`}>
      {method ? `${method} · ${titleCase(status)}` : titleCase(status)}
    </span>
  );
}

export function VerificationStatusBadge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 whitespace-nowrap ${VERIFICATION_STYLES[status] || "bg-ink/10 text-ink/70"} ${className}`}>
      {titleCase(status)}
    </span>
  );
}

export function DeliveryStatusBadge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 whitespace-nowrap ${DELIVERY_STYLES[status] || "bg-ink/10 text-ink/70"} ${className}`}>
      {status.split("_").map(titleCase).join(" ")}
    </span>
  );
}
