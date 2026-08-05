/**
 * Which social sign-in providers are offered in the UI.
 *
 * This is deliberately separate from whether a provider is *implemented* or
 * *configured*. The Facebook OAuth flow in src/server/oauth.ts is complete and
 * its credentials remain in the environment — it is only hidden from the
 * interface while the Meta developer account is under identity verification,
 * because an app that has not cleared review rejects sign-in for anyone without
 * a role on it. Showing a button that always fails is worse than showing none.
 *
 * To re-enable once Meta approves the account: flip `facebook` to true here.
 * That is the whole change — no route, provider or environment variable was
 * removed, and src/server/__tests__/oauth.test.ts still covers the flow.
 */
export const SOCIAL_LOGIN_ENABLED = {
  google: true,
  facebook: false,
} as const;

export type SocialProvider = keyof typeof SOCIAL_LOGIN_ENABLED;

export function enabledSocialProviders(): SocialProvider[] {
  return (Object.keys(SOCIAL_LOGIN_ENABLED) as SocialProvider[]).filter(
    (p) => SOCIAL_LOGIN_ENABLED[p]
  );
}
