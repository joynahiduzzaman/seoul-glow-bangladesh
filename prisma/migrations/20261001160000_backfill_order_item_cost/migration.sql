-- Backfill the cost snapshot for orders placed before OrderItem.costPrice existed.
--
-- The column was added in the previous migration, which left every historical
-- row NULL. finance.ts counts a NULL-cost unit in `unitsMissingCost` rather than
-- assuming it was free, so the dashboard was honest about it — but it meant the
-- entire back catalogue reported a 100% margin and no usable profit figure.
--
-- Copying each product's current cost in is the closest approximation available:
-- it is the supplier price the shop is paying today, applied to what it already
-- sold. From the previous migration onwards every new order captures its own
-- true cost at the moment of sale, so this approximation never grows.
--
-- Only rows whose product actually has a cost are touched. A product with no
-- costPrice stays NULL, because recording it as costing zero would overstate
-- profit — the one direction this calculation must never fail in.
UPDATE "OrderItem" oi
SET "costPrice" = p."costPrice"
FROM "Product" p
WHERE oi."productId" = p."id"
  AND oi."costPrice" IS NULL
  AND p."costPrice" IS NOT NULL;
