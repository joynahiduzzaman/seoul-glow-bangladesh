"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellRing, Package, Tag, Megaphone, UserCog, Check, Loader2 } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** Each notification type gets its own mark so the list can be skimmed by shape
 *  rather than read line by line. Types come from the Notification model. */
const ICONS: Record<string, { Icon: typeof Package; tint: string }> = {
  ORDER_PLACED: { Icon: Package, tint: "bg-[#4A6FA5]/12 text-[#3D5C8A]" },
  ORDER_STATUS: { Icon: Package, tint: "bg-[#4A6FA5]/12 text-[#3D5C8A]" },
  COUPON: { Icon: Tag, tint: "bg-[#B08040]/15 text-[#8A6330]" },
  PROMO: { Icon: Megaphone, tint: "bg-rose-gold/15 text-rose-gold-text" },
  GENERAL: { Icon: Megaphone, tint: "bg-rose-gold/15 text-rose-gold-text" },
  WELCOME: { Icon: UserCog, tint: "bg-[#5B7B4F]/15 text-[#456049]" },
  ACCOUNT: { Icon: UserCog, tint: "bg-[#5B7B4F]/15 text-[#456049]" },
};

function markFor(type: string) {
  return ICONS[type] ?? ICONS.GENERAL;
}

/** "2h ago" style, falling back to a date once it stops being useful. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Notification bell for the storefront header.
 *
 * Reads the account notification API that already exists rather than
 * introducing a second store; the only new endpoint is the bulk mark-as-read,
 * which the panel needs and which would otherwise be one request per row.
 *
 * The list is fetched when the panel opens and once per navigation, not on a
 * timer — a badge that is a few seconds stale costs nothing, where a poll on
 * every header instance costs a request per interval for every visitor.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnread(Number(data.unreadCount) || 0);
    } catch {
      /* a failed badge refresh is not worth interrupting the page for */
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh the count on navigation so placing an order updates the bell.
  useEffect(() => {
    load();
    setOpen(false);
  }, [pathname, load]);

  useEffect(() => {
    if (!open) return;
    load();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, load]);

  async function markAll() {
    if (marking || unread === 0) return;
    setMarking(true);
    // Optimistic: the request is a write the user already committed to, and
    // reverting on failure is handled by the reload below.
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await fetch("/api/account/notifications/read-all", { method: "POST" });
    } finally {
      setMarking(false);
      load();
    }
  }

  async function openItem(n: Notification) {
    setOpen(false);
    if (n.read) return;
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await fetch(`/api/account/notifications/${n.id}`, { method: "PATCH" });
    } catch {
      /* the row is already marked locally; the next load reconciles */
    }
  }

  return (
    // Static below sm so the panel anchors to the sticky <header> rather than to
    // the bell itself. Anchored to the bell, `right-0` put a 296px panel at
    // left:-54 on a 320px screen — off the edge of the phone. Anchored to the
    // header, its right edge is the screen's, so the panel always lands inside.
    <div ref={ref} className="static sm:relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative touch-target transition-colors hover:text-rose-gold active:scale-95"
      >
        {unread > 0 ? <BellRing size={20} /> : <Bell size={20} />}
        {unread > 0 && (
          // Matches the cart badge exactly — same size, ring and cap — so the
          // two counters in one bar read as one system.
          <span className="absolute right-1 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-gold px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-cream">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            role="dialog"
            aria-label="Notifications"
            // Width is capped against the viewport so the panel can never sit
            // outside it on a narrow phone, where `right-0` alone would not be
            // enough once the panel is wider than the screen.
            className="absolute right-3 sm:right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-xl2 border border-border-soft bg-white shadow-e4"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-3">
              <p className="font-display text-[15px] font-semibold text-ink">
                Notifications
                {unread > 0 && <span className="ml-1.5 text-xs font-medium text-rose-gold-text">({unread} new)</span>}
              </p>
              {unread > 0 && (
                <button
                  onClick={markAll}
                  disabled={marking}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink/55 transition-colors hover:text-rose-gold-text disabled:opacity-50"
                >
                  {marking ? <Loader2 size={11} className="animate-spin" /> : <Check size={12} />}
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-ink/50">
                  <Loader2 size={15} className="animate-spin" /> Loading…
                </div>
              ) : items.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <span
                    aria-hidden="true"
                    className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-beige to-soft-pink/60 text-rose-gold-text"
                  >
                    <Bell size={22} strokeWidth={1.6} />
                  </span>
                  <p className="font-display text-[15px] text-ink">You&rsquo;re all caught up</p>
                  <p className="mx-auto mt-1.5 max-w-[15rem] text-xs leading-relaxed text-body">
                    Order updates, offers and account notices will appear here.
                  </p>
                </div>
              ) : (
                <ul>
                  {items.map((n) => {
                    const { Icon, tint } = markFor(n.type);
                    const body = (
                      <>
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tint}`} aria-hidden="true">
                          <Icon size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-2">
                            <span className={`flex-1 text-[13px] leading-snug ${n.read ? "font-medium text-ink/75" : "font-semibold text-ink"}`}>
                              {n.title}
                            </span>
                            {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-gold" aria-label="Unread" />}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-body [overflow-wrap:anywhere]">{n.message}</span>
                          <span className="mt-1 block text-[11px] text-ink/40">{timeAgo(n.createdAt)}</span>
                        </span>
                      </>
                    );
                    const cls = `flex w-full gap-3 px-4 py-3 text-left transition-colors ${n.read ? "hover:bg-beige/50" : "bg-rose-gold/[0.04] hover:bg-rose-gold/[0.08]"}`;
                    return (
                      <li key={n.id} className="border-b border-border-soft/70 last:border-b-0">
                        {n.link ? (
                          <Link href={n.link} onClick={() => openItem(n)} className={cls}>
                            {body}
                          </Link>
                        ) : (
                          <button type="button" onClick={() => openItem(n)} className={cls}>
                            {body}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-border-soft bg-beige/30 px-4 py-2.5 text-center">
              <Link
                href="/account/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-ink/70 transition-colors hover:text-rose-gold-text"
              >
                View all notifications
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
