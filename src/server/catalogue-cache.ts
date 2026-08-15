import { revalidatePath } from "next/cache";
import { invalidateNavMenu } from "@/server/nav-menu";

/**
 * Purge everything the storefront caches about the catalogue.
 *
 * The product routes did no invalidation at all, so a product only appeared,
 * changed or vanished when the 60-second ISR window happened to roll over —
 * which from the admin's chair looks like "I saved it and nothing happened".
 * The brand and category routes purged / and /shop but not the two directory
 * pages that list them.
 *
 * The header menu matters most here: it is now read from the catalogue, and
 * its cache window is five minutes, so without the tag purge an admin who
 * stocked a brand would keep seeing the old dropdown long enough to file it as
 * a bug.
 *
 * `productSlug` also purges that product's own page, which is otherwise the
 * slowest thing on the site to catch up.
 */
export function revalidateCatalogue(productSlug?: string) {
  invalidateNavMenu();
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/brands");
  revalidatePath("/categories");
  if (productSlug) revalidatePath(`/product/${productSlug}`);
}
