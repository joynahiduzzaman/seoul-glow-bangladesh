"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "sans-serif", textAlign: "center", padding: "80px 20px" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>Something went wrong</h1>
        <p style={{ color: "#666", marginBottom: "8px" }}>
          The app hit an unexpected error while loading. Please try again — if it persists, check your
          browser's DevTools console (F12) for the error message.
        </p>
        {error?.message && (
          <p style={{ color: "#999", fontFamily: "monospace", fontSize: "12px", marginBottom: "24px" }}>{error.message}</p>
        )}
        <button
          onClick={reset}
          style={{ background: "#C68A8A", color: "white", padding: "12px 28px", borderRadius: "12px", border: "none", cursor: "pointer" }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
