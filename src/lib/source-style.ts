/** Tailwind classes for a booking source / channel name. Shared by server and client components. */
export const sourceColor = (s?: string) => {
  const n = (s ?? "").toLowerCase();
  if (n.includes("airbnb")) return "bg-rose-500 text-white";
  if (n.includes("booking")) return "bg-blue-600 text-white";
  if (n.includes("makemytrip") || n.includes("goibibo") || n.includes("mmt")) return "bg-orange-500 text-white";
  if (n === "direct") return "bg-pine text-white";
  if (n === "manual") return "bg-lake text-white";
  return "bg-slate-500 text-white";
};
