"use client";

import Image from "next/image";
import { useState } from "react";

export function initialsOf(name: string, email?: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  // A social account can arrive with a blank name; the email's first letters are
  // still better than a generic glyph.
  return (email || "?").slice(0, 2).toUpperCase();
}

/**
 * The signed-in customer's mark.
 *
 * Renders their photo when one is on file and falls back to initials on a warm
 * rose plate. The fallback is not a placeholder to be replaced later — most
 * accounts here are email/phone registrations that will never have a photo, so
 * initials are the normal case and are styled as a deliberate avatar rather
 * than an empty state.
 *
 * A broken or expired remote photo falls back too: social CDNs expire URLs, and
 * a snapped image icon in the navbar looks like a bug.
 */
export default function UserAvatar({
  name,
  email,
  image,
  size = 32,
  className = "",
}: {
  name: string;
  email?: string;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(image) && !failed;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-ink/10 ${className}`}
      style={{ width: size, height: size }}
    >
      {showPhoto ? (
        <Image
          src={image as string}
          alt=""
          aria-hidden="true"
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={() => setFailed(true)}
          // Avatar hosts are numerous and change; skipping the optimiser avoids
          // a 400 from an un-allowlisted remote host taking the image out.
          unoptimized
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-gold to-[#A35252] font-semibold text-white"
          style={{ fontSize: Math.max(10, Math.round(size * 0.36)) }}
        >
          {initialsOf(name, email)}
        </span>
      )}
    </span>
  );
}
