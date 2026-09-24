"use client";

/** Submits the parent server-action form as soon as the value changes. */
export default function StatusSelect({ name = "status", value, options }: { name?: string; value: string; options: string[] }) {
  return (
    <select name={name} defaultValue={value} onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm">
      {options.map((o) => <option key={o} value={o}>{o.charAt(0) + o.slice(1).toLowerCase()}</option>)}
    </select>
  );
}
