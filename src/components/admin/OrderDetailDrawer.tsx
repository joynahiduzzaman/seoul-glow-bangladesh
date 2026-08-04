"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  X, Printer, FileText, Tag, Truck, MessageSquare, UserCircle2, CreditCard,
  ShoppingBag, RefreshCw, Loader2, Send, CheckCircle2, Radio, Wallet, XCircle, Trash2,
} from "lucide-react";
import { formatBDT } from "@/lib/utils";
import { PAYMENT_STATUSES, validNextStatuses } from "@/lib/order-status";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, MOBILE_BANKING_METHODS } from "@/lib/payment";
import { COURIERS, COURIER_LABELS, DELIVERY_STATUSES, DELIVERY_STATUS_LABELS, CourierValue } from "@/lib/shipping";
import { OrderStatusBadge, PaymentStatusBadge, VerificationStatusBadge, DeliveryStatusBadge } from "./OrderBadges";

const SOURCE_LABELS: Record<string, string> = {
  ONLINE: "Online storefront",
  PHONE: "Phone order",
  MESSENGER: "Facebook Messenger",
  WALK_IN: "Walk-in",
};

interface OrderItem {
  id: string;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
  product: { slug: string };
}
interface OrderEvent {
  id: string;
  type: string;
  message: string;
  createdBy: string;
  createdAt: string;
}
interface StaffOption {
  id: string;
  name: string;
  role: string;
}
interface Payment {
  id: string;
  method: string;
  amount: number;
  transactionId: string | null;
  senderNumber: string | null;
  verificationStatus: string;
  verifiedBy: { id: string; name: string } | null;
  verifiedAt: string | null;
  paidAt: string;
  notes: string | null;
}
interface Shipment {
  id: string;
  courier: string;
  customCourierName: string | null;
  trackingNumber: string | null;
  deliveryStatus: string;
  estimatedDelivery: string | null;
  shippingNotes: string | null;
  assignedBy: { id: string; name: string } | null;
}
interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  shippingName: string;
  shippingPhone: string;
  shippingDistrict: string;
  shippingArea: string;
  shippingStreet: string;
  shippingLabel: string;
  insideDhaka: boolean;
  giftNote: string | null;
  guestEmail: string | null;
  assignedStaffId: string | null;
  source: string;
  createdAt: string;
  items: OrderItem[];
  user: { id: string; name: string; email: string; phone: string | null; createdAt: string } | null;
  assignedStaff: { id: string; name: string } | null;
  createdByStaff: { id: string; name: string } | null;
  events: OrderEvent[];
  payments: Payment[];
  shipment: Shipment | null;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" });
}

function todayInputDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const EVENT_ICON: Record<string, any> = {
  PLACED: ShoppingBag,
  STATUS_CHANGE: RefreshCw,
  PAYMENT_CHANGE: CreditCard,
  NOTE: MessageSquare,
  ASSIGNMENT: UserCircle2,
  TRACKING: Truck,
};

export default function OrderDetailDrawer({
  orderId,
  onClose,
  onUpdated,
}: {
  orderId: string | null;
  onClose: () => void;
  onUpdated?: (order: OrderDetail) => void;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [customerOrderCount, setCustomerOrderCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [confirmingDraft, setConfirmingDraft] = useState(false);
  const fetchToken = useRef(0);

  // Shipment form
  const [courierDraft, setCourierDraft] = useState<CourierValue>("STEADFAST");
  const [customCourierDraft, setCustomCourierDraft] = useState("");
  const [trackingDraft, setTrackingDraft] = useState("");
  const [estimatedDeliveryDraft, setEstimatedDeliveryDraft] = useState("");
  const [shippingNotesDraft, setShippingNotesDraft] = useState("");
  const [savingShipment, setSavingShipment] = useState(false);
  const [savingDeliveryStatus, setSavingDeliveryStatus] = useState(false);

  // Payment record form
  const [paymentMethodDraft, setPaymentMethodDraft] = useState<(typeof PAYMENT_METHODS)[number]>("COD");
  const [paymentAmountDraft, setPaymentAmountDraft] = useState("");
  const [paymentTxnDraft, setPaymentTxnDraft] = useState("");
  const [paymentSenderDraft, setPaymentSenderDraft] = useState("");
  const [paymentDateDraft, setPaymentDateDraft] = useState(todayInputDate());
  const [paymentNotesDraft, setPaymentNotesDraft] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [resolvingPaymentId, setResolvingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const token = ++fetchToken.current;
    setLoading(true);
    setOrder(null);
    fetch(`/api/admin/orders/${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        if (fetchToken.current !== token) return;
        if (!data.order) {
          toast.error("Order not found");
          onClose();
          return;
        }
        setOrder(data.order);
        setStaff(data.staff || []);
        setCustomerOrderCount(data.customerOrderCount ?? null);
        const shipment: Shipment | null = data.order.shipment;
        setCourierDraft((shipment?.courier as CourierValue) || "STEADFAST");
        setCustomCourierDraft(shipment?.customCourierName || "");
        setTrackingDraft(shipment?.trackingNumber || "");
        setEstimatedDeliveryDraft(shipment?.estimatedDelivery ? shipment.estimatedDelivery.slice(0, 10) : "");
        setShippingNotesDraft(shipment?.shippingNotes || "");
        const verifiedTotal = (data.order.payments as Payment[])
          .filter((p) => p.verificationStatus === "VERIFIED")
          .reduce((sum, p) => sum + p.amount, 0);
        setPaymentAmountDraft(String(Math.max(0, data.order.total - verifiedTotal)) || "");
      })
      .catch(() => toast.error("Failed to load order"))
      .finally(() => {
        if (fetchToken.current === token) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function refreshDetail() {
    if (!order) return;
    const token = ++fetchToken.current;
    const detail = await fetch(`/api/admin/orders/${order.id}`).then((r) => r.json());
    if (fetchToken.current !== token) return;
    setOrder(detail.order);
    onUpdated?.(detail.order);
  }

  async function patchOrder(field: string, data: Record<string, any>, successMessage: string) {
    if (!order) return;
    setSavingField(field);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setOrder((prev) => (prev ? { ...prev, ...json.order } : prev));
      toast.success(successMessage);
      // Deliberately NOT calling router.refresh() here — see refreshDetail below;
      // that re-renders the orders list's server component on every field save,
      // which was found to unmount this drawer mid-edit. `onUpdated` keeps the
      // underlying table row in sync instead.
      await refreshDetail();
    } catch (err: any) {
      toast.error(err.message || "Failed to update order");
    } finally {
      setSavingField(null);
    }
  }

  async function handleConfirmDraft() {
    if (!order) return;
    setConfirmingDraft(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Draft confirmed — order placed and stock reserved");
      await refreshDetail();
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm order");
    } finally {
      setConfirmingDraft(false);
    }
  }

  async function handleAddNote() {
    if (!order || !noteDraft.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: noteDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Bumping the shared token invalidates any still-in-flight refresh fetched
      // before this note was added — without it, that older fetch could land
      // after this one and overwrite the events list back to a pre-note snapshot.
      ++fetchToken.current;
      setOrder((prev) => (prev ? { ...prev, events: data.events } : prev));
      setNoteDraft("");
      toast.success("Note added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleRecordPayment() {
    if (!order) return;
    const amount = Number(paymentAmountDraft);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    setRecordingPayment(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: paymentMethodDraft,
          amount,
          transactionId: paymentTxnDraft.trim() || undefined,
          senderNumber: paymentSenderDraft.trim() || undefined,
          paidAt: paymentDateDraft ? new Date(paymentDateDraft).toISOString() : undefined,
          notes: paymentNotesDraft.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Payment recorded — pending verification");
      setPaymentTxnDraft("");
      setPaymentSenderDraft("");
      setPaymentNotesDraft("");
      ++fetchToken.current;
      setOrder((prev) => (prev ? { ...prev, payments: data.payments, events: data.events } : prev));
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  }

  async function handleResolvePayment(paymentId: string, verificationStatus: "VERIFIED" | "REJECTED") {
    if (!order) return;
    setResolvingPaymentId(paymentId);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(verificationStatus === "VERIFIED" ? "Payment verified" : "Payment rejected");
      ++fetchToken.current;
      setOrder((prev) =>
        prev ? { ...prev, payments: data.payments, events: data.events, paymentStatus: data.paymentStatus ?? prev.paymentStatus } : prev
      );
      onUpdated?.({ ...(order as OrderDetail), paymentStatus: data.paymentStatus ?? order.paymentStatus });
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment");
    } finally {
      setResolvingPaymentId(null);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!order) return;
    setResolvingPaymentId(paymentId);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/payments/${paymentId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Payment record removed");
      ++fetchToken.current;
      setOrder((prev) => (prev ? { ...prev, payments: data.payments, events: data.events } : prev));
    } catch (err: any) {
      toast.error(err.message || "Failed to remove payment");
    } finally {
      setResolvingPaymentId(null);
    }
  }

  async function handleSaveShipment() {
    if (!order) return;
    if (courierDraft === "CUSTOM" && !customCourierDraft.trim()) {
      toast.error("Enter a name for the custom courier");
      return;
    }
    setSavingShipment(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courier: courierDraft,
          customCourierName: courierDraft === "CUSTOM" ? customCourierDraft.trim() : undefined,
          trackingNumber: trackingDraft.trim() || undefined,
          estimatedDelivery: estimatedDeliveryDraft || undefined,
          shippingNotes: shippingNotesDraft.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Shipment saved");
      setTrackingDraft(data.shipment.trackingNumber || "");
      ++fetchToken.current;
      setOrder((prev) => (prev ? { ...prev, shipment: data.shipment, events: data.events } : prev));
    } catch (err: any) {
      toast.error(err.message || "Failed to save shipment");
    } finally {
      setSavingShipment(false);
    }
  }

  async function handleUpdateDeliveryStatus(deliveryStatus: string) {
    if (!order) return;
    setSavingDeliveryStatus(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/shipment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Delivery status updated");
      ++fetchToken.current;
      setOrder((prev) => (prev ? { ...prev, shipment: data.shipment, events: data.events } : prev));
    } catch (err: any) {
      toast.error(err.message || "Failed to update delivery status");
    } finally {
      setSavingDeliveryStatus(false);
    }
  }

  const isOpen = orderId !== null;
  const verifiedTotal = order ? order.payments.filter((p) => p.verificationStatus === "VERIFIED").reduce((sum, p) => sum + p.amount, 0) : 0;
  const shipmentUnchanged =
    order?.shipment != null &&
    courierDraft === order.shipment.courier &&
    customCourierDraft === (order.shipment.customCourierName || "") &&
    trackingDraft === (order.shipment.trackingNumber || "") &&
    estimatedDeliveryDraft === (order.shipment.estimatedDelivery ? order.shipment.estimatedDelivery.slice(0, 10) : "") &&
    shippingNotesDraft === (order.shipment.shippingNotes || "");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="relative bg-cream w-full max-w-2xl h-full overflow-y-auto shadow-2xl"
            data-testid="order-drawer"
          >
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-border-soft">
              <div>
                <h3 className="font-display text-lg">{order ? order.orderNumber : "Loading…"}</h3>
                {order && (
                  <p className="text-xs text-ink/70">
                    Placed {new Date(order.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}
              </div>
              <button onClick={onClose} aria-label="Close" className="text-ink/70 hover:text-ink"><X size={18} /></button>
            </div>

            {loading && (
              <div className="p-6 space-y-4 animate-pulse">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 bg-white rounded-xl2" />)}
              </div>
            )}

            {!loading && order && (
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.paymentStatus} method={order.paymentMethod} />
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink/70">
                    <Radio size={11} /> {SOURCE_LABELS[order.source] || order.source}
                  </span>
                  {order.createdByStaff && (
                    <span className="text-[11px] text-ink/70">· recorded by {order.createdByStaff.name}</span>
                  )}
                </div>

                {order.status === "DRAFT" && (
                  <div className="bg-gold/10 border border-gold/30 rounded-xl2 p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">This order is still a draft</p>
                      <p className="text-xs text-ink/70">Nothing has been reserved yet. Confirm to place it for real.</p>
                    </div>
                    <button
                      onClick={handleConfirmDraft}
                      disabled={confirmingDraft}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-ink text-white px-4 py-2 text-xs font-medium disabled:opacity-50 shrink-0"
                    >
                      {confirmingDraft ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Confirm Order
                    </button>
                  </div>
                )}

                {/* Quick print actions */}
                <div className="flex gap-2">
                  <a
                    href={`/admin-print/orders/${order.id}/invoice`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white py-2.5 text-xs font-medium hover:border-rose-gold hover:text-rose-gold-text transition-colors"
                  >
                    <FileText size={14} /> Invoice
                  </a>
                  <a
                    href={`/admin-print/orders/${order.id}/packing-slip`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white py-2.5 text-xs font-medium hover:border-rose-gold hover:text-rose-gold-text transition-colors"
                  >
                    <Printer size={14} /> Packing Slip
                  </a>
                  <a
                    href={`/admin-print/orders/${order.id}/shipping-label`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white py-2.5 text-xs font-medium hover:border-rose-gold hover:text-rose-gold-text transition-colors"
                  >
                    <Tag size={14} /> Ship Label
                  </a>
                </div>

                {/* Status + Payment + Assigned staff controls */}
                <div className="bg-white rounded-xl2 shadow-soft p-5 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-ink/70 mb-1.5">Order Status</label>
                    {order.status === "DRAFT" ? (
                      <p className="text-sm text-ink/70 py-2">Use "Confirm Order" above</p>
                    ) : (
                      <select
                        value={order.status}
                        disabled={savingField === "status"}
                        onChange={(e) => patchOrder("status", { status: e.target.value }, "Order status updated")}
                        className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                      >
                        <option value={order.status}>{order.status.charAt(0) + order.status.slice(1).toLowerCase()} (current)</option>
                        {validNextStatuses(order.status).map((s) => (
                          <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] text-ink/70 mb-1.5">Payment Status</label>
                    <select
                      value={order.paymentStatus}
                      disabled={savingField === "paymentStatus"}
                      onChange={(e) => patchOrder("paymentStatus", { paymentStatus: e.target.value }, "Payment status updated")}
                      className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                    >
                      {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] text-ink/70 mb-1.5">Assigned Staff</label>
                    <select
                      value={order.assignedStaffId || ""}
                      disabled={savingField === "assignedStaffId"}
                      onChange={(e) => patchOrder("assignedStaffId", { assignedStaffId: e.target.value || null }, "Assignment updated")}
                      className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                    </select>
                  </div>
                </div>

                {/* Payments ledger + reconciliation */}
                <div className="bg-white rounded-xl2 shadow-soft p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><Wallet size={15} /> Payments</h4>
                    <p className="text-[11px] text-ink/70">{formatBDT(verifiedTotal)} verified of {formatBDT(order.total)}</p>
                  </div>

                  {order.payments.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {order.payments.map((p) => (
                        <div key={p.id} className="rounded-lg border border-ink/10 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{formatBDT(p.amount)} · {PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] || p.method}</p>
                              <p className="text-[11px] text-ink/70">
                                {new Date(p.paidAt).toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" })}
                                {p.transactionId && ` · TXN ${p.transactionId}`}
                                {p.senderNumber && ` · from ${p.senderNumber}`}
                              </p>
                              {p.notes && <p className="text-[11px] text-ink/70 italic mt-1">{p.notes}</p>}
                            </div>
                            <VerificationStatusBadge status={p.verificationStatus} className="shrink-0" />
                          </div>
                          {p.verificationStatus === "UNVERIFIED" ? (
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleResolvePayment(p.id, "VERIFIED")}
                                disabled={resolvingPaymentId === p.id}
                                className="inline-flex items-center gap-1 text-xs rounded-lg bg-success/10 text-success px-3 py-1.5 disabled:opacity-50"
                              >
                                <CheckCircle2 size={12} /> Verify
                              </button>
                              <button
                                onClick={() => handleResolvePayment(p.id, "REJECTED")}
                                disabled={resolvingPaymentId === p.id}
                                className="inline-flex items-center gap-1 text-xs rounded-lg bg-badge-sale/10 text-badge-sale px-3 py-1.5 disabled:opacity-50"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                              <button
                                onClick={() => handleDeletePayment(p.id)}
                                disabled={resolvingPaymentId === p.id}
                                aria-label="Remove payment record"
                                className="ml-auto text-ink/30 hover:text-red-500 disabled:opacity-50"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : (
                            <p className="text-[11px] text-ink/70 mt-2">
                              {p.verificationStatus === "VERIFIED" ? "Verified" : "Rejected"} by {p.verifiedBy?.name || "—"}
                              {p.verifiedAt && ` · ${timeAgo(p.verifiedAt)}`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-border-soft space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={paymentMethodDraft}
                        onChange={(e) => setPaymentMethodDraft(e.target.value as (typeof PAYMENT_METHODS)[number])}
                        className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
                      >
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={paymentAmountDraft}
                        onChange={(e) => setPaymentAmountDraft(e.target.value)}
                        placeholder="Amount"
                        className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
                      />
                    </div>
                    {MOBILE_BANKING_METHODS.includes(paymentMethodDraft as any) && (
                      <input
                        value={paymentSenderDraft}
                        onChange={(e) => setPaymentSenderDraft(e.target.value)}
                        placeholder="Sender number (for reconciliation)"
                        className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                      />
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={paymentTxnDraft}
                        onChange={(e) => setPaymentTxnDraft(e.target.value)}
                        placeholder="Transaction ID (optional)"
                        className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
                      />
                      <input
                        type="date"
                        value={paymentDateDraft}
                        onChange={(e) => setPaymentDateDraft(e.target.value)}
                        className="rounded-lg border border-ink/10 px-3 py-2 text-sm"
                      />
                    </div>
                    <textarea
                      value={paymentNotesDraft}
                      onChange={(e) => setPaymentNotesDraft(e.target.value)}
                      rows={2}
                      placeholder="Notes (optional)"
                      className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm resize-none"
                    />
                    <button
                      onClick={handleRecordPayment}
                      disabled={recordingPayment}
                      className="text-xs rounded-lg bg-ink text-white px-4 py-2 disabled:opacity-40"
                    >
                      {recordingPayment ? "Recording…" : "Record Payment"}
                    </button>
                  </div>
                </div>

                {/* Shipment: courier assignment, tracking, delivery status */}
                <div className="bg-white rounded-xl2 shadow-soft p-5">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Truck size={15} /> Shipment</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[11px] text-ink/70 mb-1.5">Courier</label>
                      <select
                        value={courierDraft}
                        onChange={(e) => setCourierDraft(e.target.value as CourierValue)}
                        className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                      >
                        {COURIERS.map((c) => <option key={c} value={c}>{COURIER_LABELS[c]}</option>)}
                      </select>
                    </div>
                    {courierDraft === "CUSTOM" ? (
                      <div>
                        <label className="block text-[11px] text-ink/70 mb-1.5">Custom Courier Name</label>
                        <input
                          value={customCourierDraft}
                          onChange={(e) => setCustomCourierDraft(e.target.value)}
                          placeholder="e.g. Sundarban Courier"
                          className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] text-ink/70 mb-1.5">Estimated Delivery</label>
                        <input
                          type="date"
                          value={estimatedDeliveryDraft}
                          onChange={(e) => setEstimatedDeliveryDraft(e.target.value)}
                          className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] text-ink/70 mb-1.5">Tracking Number</label>
                      <input
                        value={trackingDraft}
                        onChange={(e) => setTrackingDraft(e.target.value)}
                        placeholder="Tracking / consignment #"
                        className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                      />
                    </div>
                    {courierDraft === "CUSTOM" && (
                      <div>
                        <label className="block text-[11px] text-ink/70 mb-1.5">Estimated Delivery</label>
                        <input
                          type="date"
                          value={estimatedDeliveryDraft}
                          onChange={(e) => setEstimatedDeliveryDraft(e.target.value)}
                          className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="block text-[11px] text-ink/70 mb-1.5">Shipping Notes</label>
                    <textarea
                      value={shippingNotesDraft}
                      onChange={(e) => setShippingNotesDraft(e.target.value)}
                      rows={2}
                      placeholder="e.g. Fragile, deliver after 5pm…"
                      className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSaveShipment}
                    disabled={savingShipment || shipmentUnchanged}
                    className="text-xs rounded-lg bg-ink text-white px-4 py-2 disabled:opacity-40"
                  >
                    {savingShipment ? "Saving…" : order.shipment ? "Update Shipment" : "Assign Courier"}
                  </button>

                  {order.shipment && (
                    <div className="mt-4 pt-4 border-t border-border-soft flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <label className="block text-[11px] text-ink/70 mb-1.5">Delivery Status</label>
                        <select
                          value={order.shipment.deliveryStatus}
                          disabled={savingDeliveryStatus}
                          onChange={(e) => handleUpdateDeliveryStatus(e.target.value)}
                          className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                        >
                          {DELIVERY_STATUSES.map((s) => <option key={s} value={s}>{DELIVERY_STATUS_LABELS[s]}</option>)}
                        </select>
                        {order.shipment.assignedBy && (
                          <p className="text-[11px] text-ink/70 mt-1.5">Assigned by {order.shipment.assignedBy.name}</p>
                        )}
                      </div>
                      <DeliveryStatusBadge status={order.shipment.deliveryStatus} className="shrink-0" />
                    </div>
                  )}
                </div>

                {/* Customer info */}
                <div className="bg-white rounded-xl2 shadow-soft p-5">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><UserCircle2 size={15} /> Customer</h4>
                  <p className="text-sm font-medium">{order.user?.name || order.shippingName}</p>
                  <p className="text-xs text-ink/70">{order.user?.email || order.guestEmail || "—"}</p>
                  <p className="text-xs text-ink/70">{order.shippingPhone}</p>
                  {order.user ? (
                    <p className="text-[11px] text-ink/70 mt-2">
                      Registered customer{customerOrderCount != null && ` · ${customerOrderCount} order${customerOrderCount === 1 ? "" : "s"} total`}
                    </p>
                  ) : (
                    <p className="text-[11px] text-ink/70 mt-2">Guest checkout</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-border-soft text-xs text-ink/70 space-y-0.5">
                    <p className="font-medium text-ink">Shipping Address ({order.shippingLabel})</p>
                    <p>{order.shippingStreet}, {order.shippingArea}</p>
                    <p>{order.shippingDistrict} · {order.insideDhaka ? "Inside Dhaka" : "Outside Dhaka"}</p>
                  </div>
                  {order.giftNote && (
                    <div className="mt-3 pt-3 border-t border-border-soft text-xs">
                      <p className="font-medium text-ink mb-0.5">Gift Note</p>
                      <p className="text-ink/70 italic">"{order.giftNote}"</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="bg-white rounded-xl2 shadow-soft p-5">
                  <h4 className="text-sm font-semibold mb-3">Items ({order.items.length})</h4>
                  <div className="space-y-3">
                    {order.items.map((item) => {
                      return (
                        <div key={item.id} className="flex gap-3 items-center">
                          <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-beige shrink-0">
                            {item.image && <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-ink/70">Qty {item.quantity} × {formatBDT(item.price)}</p>
                          </div>
                          <span className="text-sm font-medium shrink-0">{formatBDT(item.price * item.quantity)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border-soft text-sm space-y-1.5">
                    <div className="flex justify-between text-ink/70"><span>Subtotal</span><span>{formatBDT(order.subtotal)}</span></div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-rose-gold">
                        <span>Discount {order.couponCode && `(${order.couponCode})`}</span><span>-{formatBDT(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-ink/70"><span>Shipping</span><span>{formatBDT(order.shippingFee)}</span></div>
                    <div className="flex justify-between font-semibold text-base pt-1.5 border-t border-border-soft"><span>Total</span><span>{formatBDT(order.total)}</span></div>
                  </div>
                </div>

                {/* Internal notes composer */}
                <div className="bg-white rounded-xl2 shadow-soft p-5">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare size={15} /> Internal Notes</h4>
                  <p className="text-[11px] text-ink/70 mb-2">Staff-only — never visible to the customer.</p>
                  <div className="flex gap-2">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      rows={2}
                      placeholder="Add a note about this order…"
                      className="flex-1 rounded-lg border border-ink/10 px-3 py-2 text-sm resize-none"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={addingNote || !noteDraft.trim()}
                      aria-label="Add note"
                      className="rounded-lg bg-ink text-white px-3 disabled:opacity-40 shrink-0"
                    >
                      {addingNote ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white rounded-xl2 shadow-soft p-5">
                  <h4 className="text-sm font-semibold mb-4">Timeline</h4>
                  <div className="space-y-4">
                    {order.events.map((ev) => {
                      const Icon = EVENT_ICON[ev.type] || RefreshCw;
                      return (
                        <div key={ev.id} className="flex gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-beige text-ink/70">
                            <Icon size={13} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-ink">{ev.message}</p>
                            <p className="text-[11px] text-ink/70">{ev.createdBy} · {timeAgo(ev.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })}
                    {/* Synthesized origin event — always last (oldest), derived from
                        Order.createdAt rather than stored, so orders from before this
                        timeline system existed still show a complete history. */}
                    <div className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-beige text-ink/70">
                        <ShoppingBag size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">
                          Order placed via {order.paymentMethod}
                          {order.source !== "ONLINE" && ` (${SOURCE_LABELS[order.source] || order.source})`}
                        </p>
                        <p className="text-[11px] text-ink/70">{timeAgo(order.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
