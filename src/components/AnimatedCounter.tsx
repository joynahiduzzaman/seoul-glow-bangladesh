"use client";

import { useCountUp } from "@/lib/use-count-up";

export default function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const value = useCountUp(target);
  return (
    <>
      {value.toLocaleString()}
      {suffix}
    </>
  );
}
