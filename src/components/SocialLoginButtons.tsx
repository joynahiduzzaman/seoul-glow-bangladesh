import { Dictionary } from "@/lib/i18n/dictionaries";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.68-3.87 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.16.27-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#1877F2" d="M18 9a9 9 0 1 0-10.4 8.89v-6.29H5.31V9h2.29V7.02c0-2.26 1.35-3.5 3.41-3.5.99 0 2.02.18 2.02.18v2.22h-1.14c-1.12 0-1.47.7-1.47 1.42V9h2.5l-.4 2.6h-2.1v6.29A9 9 0 0 0 18 9Z" />
    </svg>
  );
}

export default function SocialLoginButtons({ dict, redirectTo }: { dict: Dictionary; redirectTo?: string }) {
  const suffix = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : "";

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-soft" />
        <span className="text-xs text-ink/70 shrink-0">{dict.auth.orContinueWith}</span>
        <div className="h-px flex-1 bg-border-soft" />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-5">
        <a
          href={`/api/auth/google${suffix}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-soft bg-white px-4 py-3 text-sm font-medium text-ink/80 shadow-e1 transition-all duration-300 ease-silk hover:border-ink/20 hover:shadow-e2 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        >
          <GoogleIcon /> Google
        </a>
        <a
          href={`/api/auth/facebook${suffix}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-soft bg-white px-4 py-3 text-sm font-medium text-ink/80 shadow-e1 transition-all duration-300 ease-silk hover:border-ink/20 hover:shadow-e2 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        >
          <FacebookIcon /> Facebook
        </a>
      </div>
    </div>
  );
}
