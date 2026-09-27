"use client";

export function PrintButton() {
  return <button className="btn btn-primary !py-2.5" onClick={() => window.print()}>Print / Save as PDF</button>;
}
