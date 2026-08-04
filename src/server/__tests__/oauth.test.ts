import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isConfigured, buildAuthorizeUrl, fetchProfile } from "../oauth";

const ENV_KEYS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET", "NEXT_PUBLIC_SITE_URL"];
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
  // siteUrl() in oauth.ts prefers NEXT_PUBLIC_SITE_URL over the request host when
  // set (as it is in this project's real .env) — pin it so redirect_uri assertions
  // below are deterministic regardless of what's in the developer's actual .env.
  process.env.NEXT_PUBLIC_SITE_URL = "https://seoulglow.com.bd";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

const fakeReq = { nextUrl: { protocol: "https:", host: "seoulglow.com.bd" } };

describe("OAuth provider gating (isConfigured)", () => {
  it("Google reports not configured when credentials are missing", () => {
    expect(isConfigured("google")).toBe(false);
  });

  it("Google reports configured once both client id and secret are set", () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    expect(isConfigured("google")).toBe(false); // secret still missing
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(isConfigured("google")).toBe(true);
  });

  it("Facebook reports not configured when credentials are missing", () => {
    expect(isConfigured("facebook")).toBe(false);
  });

  it("Facebook reports configured once both client id and secret are set", () => {
    process.env.FACEBOOK_CLIENT_ID = "id";
    process.env.FACEBOOK_CLIENT_SECRET = "secret";
    expect(isConfigured("facebook")).toBe(true);
  });

  it("Google and Facebook configuration are independent of each other", () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(isConfigured("google")).toBe(true);
    expect(isConfigured("facebook")).toBe(false);
  });
});

describe("buildAuthorizeUrl", () => {
  it("builds a correct Google authorization URL", () => {
    process.env.GOOGLE_CLIENT_ID = "google-id-123";
    const url = new URL(buildAuthorizeUrl(fakeReq as any, "google", "state-abc"));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("google-id-123");
    expect(url.searchParams.get("redirect_uri")).toBe("https://seoulglow.com.bd/api/auth/google/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("state-abc");
  });

  it("builds a correct Facebook authorization URL", () => {
    process.env.FACEBOOK_CLIENT_ID = "fb-id-456";
    const url = new URL(buildAuthorizeUrl(fakeReq as any, "facebook", "state-xyz"));
    expect(url.origin + url.pathname).toBe("https://www.facebook.com/v19.0/dialog/oauth");
    expect(url.searchParams.get("client_id")).toBe("fb-id-456");
    expect(url.searchParams.get("redirect_uri")).toBe("https://seoulglow.com.bd/api/auth/facebook/callback");
    expect(url.searchParams.get("scope")).toBe("email public_profile");
    expect(url.searchParams.get("state")).toBe("state-xyz");
  });

  it("redirect_uri always points back to this site's own callback route, never an external one", () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    const googleUrl = new URL(buildAuthorizeUrl(fakeReq as any, "google", "s"));
    process.env.FACEBOOK_CLIENT_ID = "id";
    const fbUrl = new URL(buildAuthorizeUrl(fakeReq as any, "facebook", "s"));
    expect(googleUrl.searchParams.get("redirect_uri")).toContain("seoulglow.com.bd/api/auth/google/callback");
    expect(fbUrl.searchParams.get("redirect_uri")).toContain("seoulglow.com.bd/api/auth/facebook/callback");
  });
});

describe("fetchProfile — token exchange + profile parsing", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("parses a successful Google token exchange + userinfo response", async () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok123" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sub: "google-uid-1", email: "jane@example.com", name: "Jane Doe" }) });
    global.fetch = fetchMock as any;

    const profile = await fetchProfile(fakeReq as any, "google", "auth-code");
    expect(profile).toEqual({ oauthId: "google-uid-1", email: "jane@example.com", name: "Jane Doe" });
    // Second call (userinfo) must carry the access token from the first (token exchange).
    const userinfoCall = fetchMock.mock.calls[1];
    expect(userinfoCall[1].headers.Authorization).toBe("Bearer tok123");
  });

  it("falls back to email, then a generic label, when Google returns no display name", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sub: "uid", email: "only-email@example.com" }) }) as any;
    const profile = await fetchProfile(fakeReq as any, "google", "code");
    expect(profile.name).toBe("only-email@example.com");
  });

  it("throws when Google's token exchange fails", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false }) as any;
    await expect(fetchProfile(fakeReq as any, "google", "bad-code")).rejects.toThrow("Google token exchange failed");
  });

  it("parses a successful Facebook token exchange + profile response", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "fb-tok" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "fb-uid-1", name: "John Smith", email: "john@example.com" }) });
    global.fetch = fetchMock as any;

    const profile = await fetchProfile(fakeReq as any, "facebook", "auth-code");
    expect(profile).toEqual({ oauthId: "fb-uid-1", email: "john@example.com", name: "John Smith" });
    // The profile fetch must be authenticated with the access token from the exchange.
    const profileCallUrl = fetchMock.mock.calls[1][0] as string;
    expect(profileCallUrl).toContain("access_token=fb-tok");
  });

  it("handles a Facebook profile with no public email (null, not a crash)", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "uid", name: "No Email User" }) }) as any;
    const profile = await fetchProfile(fakeReq as any, "facebook", "code");
    expect(profile.email).toBeNull();
    expect(profile.name).toBe("No Email User");
  });

  it("throws when Facebook's profile fetch fails", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok" }) })
      .mockResolvedValueOnce({ ok: false }) as any;
    await expect(fetchProfile(fakeReq as any, "facebook", "code")).rejects.toThrow("Facebook profile fetch failed");
  });
});
