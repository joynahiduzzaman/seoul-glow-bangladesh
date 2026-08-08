"use client";

import { useEffect, useState } from "react";
import { parseJsonArray } from "@/lib/utils";
import { PickerOption } from "@/components/admin/homepage/MultiSelectPicker";

type PickerKind = "products" | "categories" | "brands" | "posts" | null;

const countLabel = (n: number | undefined) =>
  typeof n === "number" ? (n === 1 ? "1 product" : `${n} products`) : undefined;

/** Fetches and maps the option list for a manual-selection picker. `kind: null`
 * means "not needed right now" (e.g. mode is "auto") — skips the fetch entirely. */
export function usePickerOptions(kind: PickerKind): { options: PickerOption[]; loading: boolean } {
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!kind) return;
    let cancelled = false;
    setLoading(true);
    const url =
      kind === "products"
        ? "/api/admin/products"
        : kind === "posts"
          ? "/api/admin/homepage-sections/preview-data?type=posts"
          : "/api/meta";
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
          // Thumbnail and count included: picking six of sixteen categories by
          // name alone means recognising them from a list of bare words, and
          // an empty one is exactly what you don't want on the homepage.
          setOptions(
            (data.categories || []).map((c: any) => ({
              id: c.id,
              label: c.name,
              sublabel: countLabel(c.productCount),
              thumbnail: c.image || undefined,
            }))
          );
        } else if (kind === "brands") {
          setOptions(
            (data.brands || []).map((b: any) => ({
              id: b.id,
              label: b.name,
              sublabel: countLabel(b.productCount),
              thumbnail: b.logo || undefined,
            }))
          );
        } else if (kind === "posts") {
          // Articles are keyed by slug rather than an id — that's what a blog
          // section stores in `postSlugs`.
          setOptions((data.posts || []).map((p: any) => ({ id: p.slug, label: p.title, sublabel: p.category, thumbnail: p.image })));
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
