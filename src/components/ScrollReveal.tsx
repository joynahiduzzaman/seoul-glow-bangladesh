"use client";

import { motion } from "framer-motion";

/**
 * Fades + slides a section up as it enters the viewport. Triggers once (viewport
 * `once: true`) so scrolling back up doesn't re-play it. Content itself is never
 * hidden without JS — `viewport={{ once: true }}` + framer-motion's SSR behavior
 * means this still renders (just static) if JS fails, per the same reliability
 * principle used in Hero.tsx.
 */
export default function ScrollReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
