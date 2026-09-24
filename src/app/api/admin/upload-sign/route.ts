import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { signUpload, uploadConfigured } from "@/lib/upload";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!uploadConfigured()) return NextResponse.json({ error: "Image upload isn't set up. Add the CLOUDINARY_* variables, or paste image links instead." }, { status: 503 });
  return NextResponse.json(signUpload());
}
