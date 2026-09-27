"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ background: "#f2efe8", fontFamily: "system-ui, sans-serif", color: "#1d1c1a", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ letterSpacing: "0.2em", fontSize: 12, textTransform: "uppercase" }}>VHI</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 40 }}>Something went wrong.</h1>
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 20px", background: "#1d1c1a", color: "#f2efe8", border: 0, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
