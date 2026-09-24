"use client";
import { useRouter } from "next/navigation";

export default function StaySwitcher({ stays, current, month }: { stays: { id: string; title: string }[]; current: string; month: string }) {
  const router = useRouter();
  return (
    <select aria-label="Switch property" value={current} onChange={(e) => router.push(`/admin/calendar/${e.target.value}?month=${month}`)} className="rounded-xl border border-line bg-white px-3 py-2 text-sm">
      {stays.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
    </select>
  );
}
