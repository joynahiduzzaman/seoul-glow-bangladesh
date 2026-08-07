/**
 * The signed-in customer's avatar.
 *
 * Drawn, not fetched: no photo is stored for any account and none is imported
 * from a social provider, so rather than a grey placeholder every customer gets
 * a small character of their own — a soft K-beauty face on a pastel plate.
 *
 * Everything about it is derived from the name through one hash, so the same
 * person always gets the same face. Nothing is random and nothing depends on
 * render order, which is what would make an avatar flicker between mounts.
 *
 * Inline SVG rather than an image: it stays crisp at any size, costs no request,
 * and renders identically on the server and the client, so it cannot cause a
 * hydration mismatch in the header.
 */

/** Soft two-stop plates. Kept pale so the face reads on top and so a row of
 *  avatars stays calm against cream. */
const PLATES: Array<[string, string]> = [
  ["#F7D9DD", "#EBB2BB"], // blossom
  ["#DDE8F4", "#B7CCE5"], // sky
  ["#E3EBDC", "#BCCFAF"], // matcha
  ["#F6E3CE", "#E7C49B"], // apricot
  ["#E6E0EF", "#C4B8DA"], // lilac
  ["#D9EAE7", "#AFD2CC"], // mint
];

/** Warm near-black for the features — softer than pure ink at 32px. */
const LINE = "#4A3B37";
const BLUSH = "#E38C99";

/** FNV-1a: small, stable, and no dependency. The same string always yields the
 *  same number in every runtime, which is the whole point here. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface AvatarSeed {
  /** Index into PLATES. */
  plate: number;
  /** 0 open · 1 happy · 2 winking. */
  eyes: number;
  /** 0 none · 1 blossom · 2 sparkle. */
  charm: number;
}

/**
 * Every visual choice for one person, derived from their name alone.
 *
 * Exported so the determinism can be asserted directly rather than only
 * inferred from a rendered page: the same input must always give the same seed,
 * and different people must not all collapse onto one face.
 */
export function avatarSeed(name: string, email?: string): AvatarSeed {
  // Each part is normalised before joining, not the joined string: trimming
  // afterwards leaves the spaces in "  Joy  |mail" untouched, so a name saved
  // with stray whitespace would draw a different face from the same name once
  // it was cleaned up.
  const key = [name, email].map((part) => (part ?? "").trim().toLowerCase()).join("|");
  const h = hash(key === "|" ? "seoul glow" : key);
  return {
    plate: h % PLATES.length,
    eyes: Math.floor(h / 7) % 3,
    charm: Math.floor(h / 13) % 3,
  };
}

export const AVATAR_PLATE_COUNT = PLATES.length;

export function initialsOf(name: string, email?: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email || "?").slice(0, 2).toUpperCase();
}

export default function UserAvatar({
  name,
  email,
  size = 32,
  className = "",
}: {
  name: string;
  email?: string;
  size?: number;
  className?: string;
}) {
  const { plate, eyes, charm } = avatarSeed(name, email);
  const [from, to] = PLATES[plate];
  // Stable id: two avatars for the same person on one page must not mint
  // different gradient ids, and the id must match between server and client.
  const gradientId = `av-${plate}-${eyes}-${charm}`;

  return (
    <span
      // Decorative: the control that owns this avatar already carries the
      // person's name in its accessible name, so announcing it twice adds noise.
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-ink/10 ${className}`}
      style={{ width: size, height: size }}
      title={initialsOf(name, email)}
    >
      <svg viewBox="0 0 40 40" width={size} height={size} role="presentation" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>

        <rect width="40" height="40" fill={`url(#${gradientId})`} />

        {/* Blush first so the eyes and mouth sit over it. */}
        <ellipse cx="10" cy="24.5" rx="3.6" ry="2.4" fill={BLUSH} opacity="0.45" />
        <ellipse cx="30" cy="24.5" rx="3.6" ry="2.4" fill={BLUSH} opacity="0.45" />

        {eyes === 1 ? (
          // Happy, closed — two upward arcs.
          <g stroke={LINE} strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M11 19.5q3-3 6 0" />
            <path d="M23 19.5q3-3 6 0" />
          </g>
        ) : eyes === 2 ? (
          <g>
            <circle cx="14" cy="18.5" r="2.5" fill={LINE} />
            <path d="M23 19.5q3-3 6 0" stroke={LINE} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          <g fill={LINE}>
            <circle cx="14" cy="18.5" r="2.5" />
            <circle cx="26" cy="18.5" r="2.5" />
          </g>
        )}

        <path d="M16.5 26q3.5 3 7 0" stroke={LINE} strokeWidth="2" strokeLinecap="round" fill="none" />

        {charm === 1 && (
          // A five-petal blossom, the brand's own motif, tucked into the corner.
          <g transform="translate(31.5 9) scale(0.85)" fill="#FFFFFF" opacity="0.9">
            {[0, 72, 144, 216, 288].map((deg) => (
              <ellipse key={deg} cx="0" cy="-3.1" rx="1.9" ry="3" transform={`rotate(${deg})`} />
            ))}
            <circle r="1.5" fill={BLUSH} />
          </g>
        )}
        {charm === 2 && (
          <path
            d="M31.5 6.2l1.15 2.65 2.65 1.15-2.65 1.15-1.15 2.65-1.15-2.65L27.7 10l2.65-1.15z"
            fill="#FFFFFF"
            opacity="0.9"
          />
        )}
      </svg>
    </span>
  );
}
