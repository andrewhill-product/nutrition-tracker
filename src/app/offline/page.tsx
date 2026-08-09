import Link from "next/link";

/**
 * Fully self-contained offline page: inline styles, no external CSS, so the
 * service worker can serve it styled straight from cache.
 */
export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "24px",
        textAlign: "center",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ fontSize: "48px" }} aria-hidden>
        ☁️
      </div>
      <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>
        You are offline
      </h1>
      <p style={{ fontSize: "16px", opacity: 0.7, margin: 0, maxWidth: "28rem" }}>
        The nutrition tracker needs a connection to load your meals. Check your
        signal and try again.
      </p>
      <Link
        href="/"
        style={{
          marginTop: "12px",
          display: "inline-block",
          padding: "14px 28px",
          borderRadius: "12px",
          background: "#4f46e5",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Try again
      </Link>
    </main>
  );
}
