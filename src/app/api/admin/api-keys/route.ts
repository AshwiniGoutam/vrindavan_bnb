import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { generateApiKey } from "@/lib/api-keys";

async function admin() {
  const u = await getCurrentUser();
  return u?.role === "ADMIN" ? u : null;
}

export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const name = String((await req.json().catch(() => ({}))).name ?? "").trim().slice(0, 60);
  if (!name) return NextResponse.json({ error: "Give the key a name." }, { status: 400 });
  const { raw, prefix, hash } = generateApiKey();
  await db.apiKey.create({ data: { name, prefix, keyHash: hash } });
  return NextResponse.json({ key: raw }); // shown once, only the hash is stored
}

export async function DELETE(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = String((await req.json().catch(() => ({}))).id ?? "");
  await db.apiKey.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
