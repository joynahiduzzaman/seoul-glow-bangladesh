"use client";

import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Shipping" },
  { id: 2, label: "Payment" },
  { id: 3, label: "Review" },
];

export default function CheckoutSteps({ current, onStepClick }: { current: number; onStepClick: (step: number) => void }) {
  return (
    <div className="flex items-center mb-6 md:mb-10">
      {STEPS.map((step, i) => {
        const isDone = step.id < current;
        const isActive = step.id === current;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => isDone && onStepClick(step.id)}
              disabled={!isDone && !isActive}
              className="flex items-center gap-2.5 touch-target !min-w-0 !justify-start -my-2"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isDone ? "bg-rose-gold text-white" : isActive ? "bg-ink text-white" : "bg-beige text-ink/70"
                }`}
              >
                {isDone ? <Check size={14} /> : step.id}
              </span>
              <span className={`text-sm font-medium hidden sm:inline ${isActive ? "text-ink" : isDone ? "text-ink/70" : "text-ink/70"}`}>
                {step.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-3 transition-colors ${isDone ? "bg-rose-gold" : "bg-ink/10"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
