import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FAF7F2",
        beige: "#F3E9DE",
        "rose-gold": "#C68A8A",
        "rose-gold-light": "#D9A5AC",
        // Text-safe accent pair. The brand rose-gold/gold are gorgeous as fills,
        // borders and icons, but as SMALL TEXT on cream they measure 2.65:1 and
        // 2.57:1 — both far below the 4.5:1 WCAG AA threshold, and together they
        // were the single largest accessibility fault on the site.
        //
        // These keep the same hue and saturation and only drop lightness until
        // they pass: 5.58:1 and 4.62:1 on cream. Use them for accent TEXT; keep
        // the originals for anything non-textual so the brand look is unchanged.
        // Tuned against the DARKEST surface each is used on, not just cream:
        // these eyebrows also sit on `bg-beige` bands, where #876C40 dropped to
        // 4.12. #7E6439 clears 4.5 on cream, beige, beige/60 and white alike.
        "rose-gold-text": "#994D4D",
        "gold-text": "#7E6439",
        olive: "#6B6B4A",
        "pastel-green": "#C9D4C0",
        "soft-pink": "#F1D9DC",
        ink: "#2F2A28",
        // New semantic tokens from the premium brand brief — body copy, hairline
        // borders, success, and a secondary "warm gold" accent distinct from rose-gold.
        body: "#6D6663",
        "border-soft": "#ECE6DF",
        success: "#4D8F6A",
        gold: "#B9975B",
        // Bold merchandising palette — Olive Young-style badge system, deliberately
        // more saturated than the soft brand palette above. Used only for badges/tags/
        // urgency UI, never for brand chrome (logo, nav, footer stay rose-gold).
        // Text-safe counterparts for the three badge tones that fail AA when used
        // as LABEL TEXT on the light `.BadgePill` surface (measured on bg-white/70
        // over cream: sale 3.42, today 2.81, new 3.33 — all below 4.5). Same hue
        // and saturation, lightness reduced only as far as needed. The originals
        // stay in use for solid fills and for BadgeStamp over photography.
        "badge-sale-text": "#CC0022",
        "badge-today-text": "#AA4700",
        "badge-new-text": "#0C835B",
        "badge-best": "#1A1A1A",
        "badge-sale": "#FF3B5C",
        "badge-coupon": "#2D6CDF",
        "badge-today": "#FF3D9A",
        "badge-new": "#16A34A",
        "badge-onetwo": "#7C3AED",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        // Elevation scale — one ramp used sitewide so "how far off the page" is
        // always a deliberate choice rather than an ad-hoc shadow per component.
        // Tinted with the brand warm-rose rather than neutral black, which keeps
        // shadows from going grey/dirty against the cream background.
        soft: "0 8px 30px rgba(183, 110, 121, 0.12)",
        glass: "0 8px 32px rgba(43, 38, 36, 0.08)",
        "e1": "0 1px 2px rgba(47, 42, 40, 0.04), 0 1px 3px rgba(47, 42, 40, 0.06)",
        "e2": "0 2px 6px rgba(47, 42, 40, 0.05), 0 6px 16px rgba(183, 110, 121, 0.08)",
        "e3": "0 4px 12px rgba(47, 42, 40, 0.06), 0 12px 32px rgba(183, 110, 121, 0.12)",
        "e4": "0 8px 24px rgba(47, 42, 40, 0.08), 0 24px 56px rgba(183, 110, 121, 0.16)",
      },
      borderRadius: {
        // Radius scale: pill (full) → control (xl, 12px) → card (xl2, 20px) →
        // surface (xl3, 28px). Components pick a rung, never a one-off px value.
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
      transitionTimingFunction: {
        // Single easing vocabulary. `silk` is the default for UI motion —
        // a gentle decelerate that reads as expensive rather than springy.
        silk: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        "silk-in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
export default config;
