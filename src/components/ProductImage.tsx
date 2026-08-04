"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * Product imagery with a blur-up reveal.
 *
 * next/image's built-in `placeholder="blur"` needs a static import or a
 * pre-generated blurDataURL, neither of which is available for admin-uploaded
 * or remote catalogue images. Instead the image starts slightly scaled and
 * blurred over the tinted plate that's already there, then settles once it has
 * decoded — the same perceived effect without shipping a base64 thumbnail for
 * every product or blocking on a build-time image pass.
 *
 * Falls back gracefully: if `onLoad` never fires (cache hit before hydration,
 * JS disabled), the image is still fully visible — the blur is an enhancement
 * layered on top, never a gate.
 */
export default function ProductImage({
  className = "",
  onLoad,
  ...props
}: ImageProps & { className?: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Image
      {...props}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      className={`${className} transition-[filter,transform,opacity] duration-700 ease-silk ${
        loaded ? "blur-0 scale-100 opacity-100" : "blur-lg scale-[1.04] opacity-70"
      }`}
    />
  );
}
