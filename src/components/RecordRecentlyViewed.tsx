"use client";

import { useEffect } from "react";
import { recordRecentlyViewed } from "@/lib/recently-viewed";

interface Props {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPercent: number;
  images: string;
  stock: number;
  brand: { name: string; slug: string };
}

/** Silently logs this product view to localStorage for the "Recently Viewed" rail. */
export default function RecordRecentlyViewed(props: Props) {
  useEffect(() => {
    recordRecentlyViewed(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);

  return null;
}
