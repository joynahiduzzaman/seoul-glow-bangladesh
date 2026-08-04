"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Package, Gift, Info } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, typeof Bell> = {
  ORDER_PLACED: Package,
  ORDER_STATUS: Package,
  WELCOME: Gift,
  GENERAL: Info,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  useEffect(() => {
    fetch("/api/account/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications))
      .catch(() => setNotifications([]));
  }, []);

  async function markRead(id: string) {
    setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) || null);
    fetch(`/api/account/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  }

  return (
    <div>
      {notifications === null ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-beige rounded-xl2" />
          <div className="h-16 bg-beige rounded-xl2" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <p className="text-sm text-ink/70">You don't have any notifications yet — updates about your orders will show up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] || Info;
            const content = (
              <div
                onClick={() => !n.read && markRead(n.id)}
                className={`card-surface p-4 flex items-start gap-3 cursor-pointer transition-colors ${!n.read ? "bg-soft-pink/10" : ""}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${!n.read ? "bg-rose-gold/15 text-rose-gold" : "bg-beige text-ink/70"}`}>
                  <Icon size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-rose-gold shrink-0" />}
                  </div>
                  <p className="text-sm text-ink/70 mt-0.5">{n.message}</p>
                  <p className="text-xs text-ink/35 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link}>
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
