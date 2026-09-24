"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyField({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={path} onFocus={(e) => e.currentTarget.select()} className="field !py-2 text-xs" aria-label="Calendar URL" />
      <button type="button" className="btn btn-ghost !px-3 !py-2" aria-label="Copy URL"
        onClick={async () => { await navigator.clipboard.writeText(new URL(path, window.location.origin).toString()); setDone(true); setTimeout(() => setDone(false), 1500); }}>
        {done ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}
