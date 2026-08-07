import { describe, it, expect } from "vitest";
import { avatarSeed, initialsOf, AVATAR_PLATE_COUNT } from "../UserAvatar";

describe("avatarSeed", () => {
  it("gives the same person the same avatar every time", () => {
    const a = avatarSeed("Morshedul Hasan", "morshedflora@gmail.com");
    for (let i = 0; i < 50; i++) {
      expect(avatarSeed("Morshedul Hasan", "morshedflora@gmail.com")).toEqual(a);
    }
  });

  it("ignores case and surrounding whitespace", () => {
    expect(avatarSeed("  Joy  ", "JOYFSL1998@GMAIL.COM")).toEqual(avatarSeed("joy", "joyfsl1998@gmail.com"));
  });

  it("keeps every choice inside its range", () => {
    const names = ["Joy", "Barfi Ui", "Store Admin", "", "  ", "রাহুল", "Zoë", "X", "a".repeat(200)];
    for (const n of names) {
      const s = avatarSeed(n);
      expect(s.plate, n).toBeGreaterThanOrEqual(0);
      expect(s.plate, n).toBeLessThan(AVATAR_PLATE_COUNT);
      expect([0, 1, 2], n).toContain(s.eyes);
      expect([0, 1, 2], n).toContain(s.charm);
    }
  });

  it("does not collapse everyone onto one face", () => {
    const names = ["Joy", "Barfi Ui", "Morshedul Hasan", "Store Admin", "Ayesha Rahman",
      "Tanvir Ahmed", "Nusrat Jahan", "Rafi Islam", "Sadia Akter", "Imran Hossain"];
    const faces = new Set(names.map((n) => JSON.stringify(avatarSeed(n))));
    // Not a uniqueness guarantee — collisions are fine and expected across a
    // 54-combination space — but ten names must not all land on one avatar.
    expect(faces.size).toBeGreaterThan(3);
    expect(new Set(names.map((n) => avatarSeed(n).plate)).size).toBeGreaterThan(1);
  });

  it("handles a missing name without throwing", () => {
    expect(() => avatarSeed("")).not.toThrow();
    expect(() => avatarSeed("", "")).not.toThrow();
    expect(avatarSeed("")).toEqual(avatarSeed(""));
  });
});

describe("initialsOf", () => {
  it("uses first and last initials for a full name", () => {
    expect(initialsOf("Morshedul Hasan")).toBe("MH");
    expect(initialsOf("Ayesha  Binte  Rahman")).toBe("AR");
  });

  it("uses the first two letters of a single name", () => {
    expect(initialsOf("Joy")).toBe("JO");
  });

  it("falls back to the email when there is no name", () => {
    expect(initialsOf("", "barfi@example.com")).toBe("BA");
  });

  it("never returns an empty string", () => {
    expect(initialsOf("").length).toBeGreaterThan(0);
    expect(initialsOf("", "").length).toBeGreaterThan(0);
  });
});
