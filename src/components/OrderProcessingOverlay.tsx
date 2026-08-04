"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Loader2, ShieldCheck, CreditCard, ReceiptText, PartyPopper } from "lucide-react";

export const ORDER_STEPS = [
  { key: "verify", label: "Verifying Order", icon: ShieldCheck },
  { key: "payment", label: "Processing Payment", icon: CreditCard },
  { key: "receipt", label: "Generating Receipt", icon: ReceiptText },
  { key: "confirmed", label: "Order Confirmed", icon: PartyPopper },
] as const;

/**
 * Full-screen order processing sequence.
 *
 * HONEST BY DESIGN: the steps track the real request rather than running a
 * fixed animation and hoping it lines up.
 *
 *   - `activeStep` is driven by the caller: it advances to "Processing Payment"
 *     once the request is actually in flight, and only reaches "Order Confirmed"
 *     when the server has genuinely confirmed the order.
 *   - If the request fails, the overlay is dismissed and the real error surfaces
 *     — it never shows "Order Confirmed" for an order that didn't happen.
 *
 * The one piece of deliberate pacing is a short minimum dwell per step, so a
 * fast response doesn't flash all four labels in a single frame. That's
 * presentation smoothing, not fabricated progress.
 */
export default function OrderProcessingOverlay({
  open,
  activeStep,
}: {
  open: boolean;
  /** Index into ORDER_STEPS the process has genuinely reached. */
  activeStep: number;
}) {
  const reduceMotion = useReducedMotion();
  const [shownStep, setShownStep] = useState(0);

  // Ease the displayed step toward the real one so each label is readable for
  // at least a moment, without ever running ahead of actual progress.
  useEffect(() => {
    if (!open) {
      setShownStep(0);
      return;
    }
    if (shownStep >= activeStep) return;
    const timer = window.setTimeout(() => setShownStep((s) => Math.min(s + 1, activeStep)), 520);
    return () => window.clearTimeout(timer);
  }, [open, activeStep, shownStep]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="Placing your order"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/70 backdrop-blur-md px-5"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
            className="w-full max-w-sm rounded-xl3 bg-cream p-8 shadow-e4"
          >
            <p className="eyebrow mb-2">Please wait</p>
            <h2 className="font-display text-2xl font-semibold text-ink mb-7">Placing your order</h2>

            <ol className="space-y-1">
              {ORDER_STEPS.map((step, i) => {
                const done = i < shownStep;
                const current = i === shownStep;
                const Icon = step.icon;
                return (
                  <li key={step.key} className="flex items-center gap-3.5 py-2.5">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-silk ${
                        done
                          ? "bg-success text-white"
                          : current
                          ? "bg-rose-gold text-white"
                          : "bg-beige text-ink/30"
                      }`}
                    >
                      {done ? (
                        <Check size={16} />
                      ) : current ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Icon size={15} />
                      )}
                    </span>
                    <span
                      className={`text-sm transition-colors duration-300 ${
                        done ? "text-ink/70" : current ? "font-medium text-ink" : "text-ink/30"
                      }`}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-7 h-1 overflow-hidden rounded-full bg-beige">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-rose-gold to-gold"
                initial={{ width: "0%" }}
                animate={{ width: `${((shownStep + 1) / ORDER_STEPS.length) * 100}%` }}
                transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
              />
            </div>

            <p className="mt-5 text-center text-xs text-ink/70">
              Please don&apos;t close this window.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
