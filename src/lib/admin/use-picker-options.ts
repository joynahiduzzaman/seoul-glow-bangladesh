"use client";

import { useEffect, useState } from "react";
import { parseJsonArray } from "@/lib/utils";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { PickerOption } from "@/components/admin/homepage/MultiSelectPicker";

type PickerKind = "products" | "categories" | "brands" | null;

/** Fetches and maps the option list for a manual-selection picker. `kind: null`
 * means "not needed right now" (e.g. mode is "auto") — skips the fetch entirely. */
export function usePickerOptions(kind: PickerKind): { options: PickerOption[]; loading: boolean } {
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!kind) return;
    let cancelled = false;
    setLoading(true);
    const url = kind === "products" ? "/api/admin/products" : "/api/meta";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (kind === "products") {
          setOptions(
            (data.products || []).map((p: any) => ({
              id: p.id,
              label: p.name,
              sublabel: p.brand?.name,
              thumbnail: parseJsonArray(p.images)[0],
            }))
          );
        } else if (kind === "categories") {
          setOptions((data.categories || []).map((c: any) => ({ id: c.id, label: c.name })));
        } else if (kind === "brands") {
          setOptions((data.brands || []).map((b: any) => ({ id: b.id, label: b.name })));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return { options, loading };
}

/** Blog posts are static site content (src/lib/blog-posts.ts), not a DB table —
 * no fetch needed, just map them into the same PickerOption shape synchronously. */
export function blogPostOptions(): PickerOption[] {
  return BLOG_POSTS.map((p) => ({ id: p.slug, label: p.title, sublabel: p.category, thumbnail: p.image }));
}
