"use client";

import { useEffect } from "react";
import Image from "next/image";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced to the browser console so this is diagnosable instead of a silent blank/broken page.
    console.error("Page error boundary caught:", error);
  }, [error]);

  return (
    <div className="container-px mx-auto py-24 text-center flex flex-col items-center">
      <Image src="/logo.png" alt="Seoul Glow Bangladesh" width={64} height={64} className="rounded-full mb-6 opacity-80" />
      <h1 className="font-display text-3xl font-semibold mb-3">Something went wrong</h1>
      <p className="text-ink/70 max-w-md mb-2">
        This page hit an unexpected error. Please try again — if it keeps happening, open your browser's
        DevTools console (F12 → Console tab) and share what's printed there so it can be tracked down.
      </p>
      {error?.message && (
        <p className="text-xs text-ink/30 font-mono max-w-md mb-8 break-words">{error.message}</p>
      )}
      <div className="flex flex-wrap gap-4 justify-center">
        <button onClick={reset} className="btn-primary">Try Again</button>
        <a href="/" className="btn-outline">Back to Home</a>
      </div>
    </div>
  );
}
