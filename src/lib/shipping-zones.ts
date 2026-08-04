import districtsData from "@/data/districts.json";
import upazilasData from "@/data/upazilas.json";

export interface District {
  id: string;
  name: string;
  division: string;
  shippingZone: string;
}

export interface Upazila {
  districtId: string;
  name: string;
}

export const DISTRICTS: District[] = districtsData;
export const UPAZILAS: Upazila[] = upazilasData;

/**
 * Single source of truth for delivery pricing — keyed by "zone" (District.shippingZone),
 * never by district name directly. To add a finer-grained tier later (e.g. Chattogram
 * ৳100, Rajshahi ৳120) you only ever touch this map plus the `shippingZone` values in
 * districts.json — nothing in checkout/admin UI code changes, since they all go through
 * getShippingFeeForDistrict()/getShippingFeeForZone() below.
 */
export const SHIPPING_RATES: Record<string, number> = {
  DHAKA: 70,
  OUTSIDE_DHAKA: 130,
};

const DEFAULT_ZONE = "OUTSIDE_DHAKA";

export function getShippingFeeForZone(zone: string | null | undefined): number {
  return SHIPPING_RATES[zone || DEFAULT_ZONE] ?? SHIPPING_RATES[DEFAULT_ZONE];
}

export function getDistrictById(districtId: string | null | undefined): District | undefined {
  return DISTRICTS.find((d) => d.id === districtId);
}

export function getDistrictByName(name: string | null | undefined): District | undefined {
  if (!name) return undefined;
  const normalized = name.trim().toLowerCase();
  return DISTRICTS.find((d) => d.name.toLowerCase() === normalized);
}

export function getShippingFeeForDistrict(districtId: string | null | undefined): number {
  return getShippingFeeForZone(getDistrictById(districtId)?.shippingZone);
}

export function getUpazilasForDistrict(districtId: string | null | undefined): Upazila[] {
  if (!districtId) return [];
  return UPAZILAS.filter((u) => u.districtId === districtId);
}

/** Whether a district's zone is Dhaka — the boolean the Order/Address models
 * store (`insideDhaka`) for backward compatibility with everything already
 * built against that field (admin, print pages, track-order, etc). */
export function isDhakaZone(districtId: string | null | undefined): boolean {
  return getDistrictById(districtId)?.shippingZone === "DHAKA";
}
