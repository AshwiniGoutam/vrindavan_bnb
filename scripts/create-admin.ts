/** Create or reset an owner account: SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run create-admin */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import mongoose from "mongoose";
import { User } from "../src/server/models";
import { hashPassword } from "../src/server/auth/password";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!process.env.MONGODB_URI || !email || !password) throw new Error("Set MONGODB_URI, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (min 10 chars).");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "vhi" });
  await User.updateOne(
    { email },
    { $set: { passwordHash: await hashPassword(password), role: "owner", active: true, failedLogins: 0 }, $unset: { lockedUntil: 1 }, $setOnInsert: { name: "VHI Owner", email } },
    { upsert: true },
  );
  console.log(`✓ Owner account ready: ${email}`);
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
