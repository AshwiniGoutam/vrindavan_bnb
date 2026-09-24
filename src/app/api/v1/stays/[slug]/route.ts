import { db } from "@/lib/db";
import { cors, publicStay, v1json } from "@/lib/v1";

export const OPTIONS = () => new Response(null, { status: 204, headers: cors });

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await db.stay.findFirst({ where: { slug, published: true } });
  return s ? v1json({ data: publicStay(s) }, { cache: "public, s-maxage=60" }) : v1json({ error: "Not found" }, { status: 404 });
}
