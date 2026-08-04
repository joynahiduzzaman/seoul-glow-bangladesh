import { describe, it, expect } from "vitest";
import {
  DISTRICTS,
  UPAZILAS,
  SHIPPING_RATES,
  getShippingFeeForZone,
  getDistrictById,
  getDistrictByName,
  getShippingFeeForDistrict,
  getUpazilasForDistrict,
  isDhakaZone,
} from "../shipping-zones";

describe("districts.json / upazilas.json data integrity", () => {
  it("contains all 64 districts of Bangladesh", () => {
    expect(DISTRICTS.length).toBe(64);
  });

  it("has no duplicate district ids", () => {
    const ids = DISTRICTS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every upazila references a real district id", () => {
    const ids = new Set(DISTRICTS.map((d) => d.id));
    for (const u of UPAZILAS) expect(ids.has(u.districtId)).toBe(true);
  });

  it("every district has at least one upazila/area", () => {
    for (const d of DISTRICTS) {
      expect(UPAZILAS.some((u) => u.districtId === d.id)).toBe(true);
    }
  });

  it("exactly one district (Dhaka) is in the DHAKA zone", () => {
    const dhakaZoneDistricts = DISTRICTS.filter((d) => d.shippingZone === "DHAKA");
    expect(dhakaZoneDistricts).toHaveLength(1);
    expect(dhakaZoneDistricts[0].name).toBe("Dhaka");
  });
});

describe("getShippingFeeForZone", () => {
  it("charges the DHAKA rate for the DHAKA zone", () => {
    expect(getShippingFeeForZone("DHAKA")).toBe(SHIPPING_RATES.DHAKA);
  });

  it("charges the OUTSIDE_DHAKA rate for any other zone", () => {
    expect(getShippingFeeForZone("OUTSIDE_DHAKA")).toBe(SHIPPING_RATES.OUTSIDE_DHAKA);
  });

  it("falls back to the OUTSIDE_DHAKA rate for an unknown/missing zone", () => {
    expect(getShippingFeeForZone(undefined)).toBe(SHIPPING_RATES.OUTSIDE_DHAKA);
    expect(getShippingFeeForZone("SOME_FUTURE_ZONE")).toBe(SHIPPING_RATES.OUTSIDE_DHAKA);
  });
});

describe("getDistrictById / getDistrictByName", () => {
  it("finds Dhaka by id", () => {
    expect(getDistrictById("dhaka")?.name).toBe("Dhaka");
  });

  it("finds a district by name case-insensitively", () => {
    expect(getDistrictByName("narail")?.id).toBe("narail");
    expect(getDistrictByName("NARAIL")?.id).toBe("narail");
  });

  it("returns undefined for an unmatched name", () => {
    expect(getDistrictByName("Not A Real District")).toBeUndefined();
  });
});

describe("getShippingFeeForDistrict — the core rule from the spec", () => {
  it("charges ৳70 for Dhaka district", () => {
    expect(getShippingFeeForDistrict("dhaka")).toBe(70);
  });

  it("charges ৳130 for Narail (or any non-Dhaka district)", () => {
    expect(getShippingFeeForDistrict("narail")).toBe(130);
  });

  it("charges the outside-Dhaka default for a missing/unknown district id", () => {
    expect(getShippingFeeForDistrict(undefined)).toBe(130);
    expect(getShippingFeeForDistrict("")).toBe(130);
  });

  // The whole point of the zone indirection: re-pricing a division doesn't
  // require touching this function or any UI — only SHIPPING_RATES/districts.json.
  it("is driven entirely by SHIPPING_RATES, not a hardcoded per-district amount", () => {
    const before = getShippingFeeForDistrict("chattogram");
    SHIPPING_RATES.OUTSIDE_DHAKA = 999;
    expect(getShippingFeeForDistrict("chattogram")).toBe(999);
    SHIPPING_RATES.OUTSIDE_DHAKA = before;
  });
});

describe("getUpazilasForDistrict", () => {
  it("returns only Narail's own upazilas", () => {
    const names = getUpazilasForDistrict("narail").map((u) => u.name);
    expect(names).toContain("Narail Sadar");
    expect(names).toContain("Lohagara");
    expect(names).toContain("Kalia");
    expect(names).not.toContain("Dhanmondi");
  });

  it("returns Dhaka's areas including both real upazilas and city thanas", () => {
    const names = getUpazilasForDistrict("dhaka").map((u) => u.name);
    for (const expected of ["Dhanmondi", "Gulshan", "Uttara", "Savar", "Keraniganj"]) {
      expect(names).toContain(expected);
    }
  });

  it("returns an empty array for no district selected", () => {
    expect(getUpazilasForDistrict(null)).toEqual([]);
    expect(getUpazilasForDistrict(undefined)).toEqual([]);
    expect(getUpazilasForDistrict("")).toEqual([]);
  });
});

describe("isDhakaZone", () => {
  it("is true only for Dhaka district", () => {
    expect(isDhakaZone("dhaka")).toBe(true);
    expect(isDhakaZone("narail")).toBe(false);
    expect(isDhakaZone("chattogram")).toBe(false);
  });

  it("is false for an unknown district", () => {
    expect(isDhakaZone("not-a-real-id")).toBe(false);
  });
});
