"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      // Kept mounted and faded rather than unmounted, so it eases in/out with the
      // rest of the site's motion instead of popping into existence at 600px.
      className={`fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink/90 text-cream shadow-e3 backdrop-blur-sm transition-all duration-300 ease-silk hover:bg-rose-gold hover:scale-105 active:scale-95 ${
        visible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-3"
      }`}
      style={{ bottom: "calc(6.25rem + env(safe-area-inset-bottom, 0px))", right: "calc(1.5rem + env(safe-area-inset-right, 0px))" }}
    >
      <ArrowUp size={18} />
    </button>
  );
}
