import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@gmail.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 12);

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    const user = await db.user.update({ where: { email }, data: { passwordHash, role: "ADMIN" } });
    console.log(`Admin updated: ${user.email}`);
    return;
  }

  const user = await db.user.create({ data: { name: "Administrator", email, passwordHash, role: "ADMIN" } });
  console.log(`Admin created: ${user.email}`);
}

main().catch(error => { console.error(error); process.exit(1); });
