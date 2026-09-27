/** Build/refresh MongoDB indexes (run after deploys that change schemas): npm run db:indexes */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import mongoose from "mongoose";
import * as models from "../src/server/models";

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "vhi" });
  for (const [name, m] of Object.entries(models)) {
    if (typeof m === "function" && "syncIndexes" in m) {
      await (m as mongoose.Model<unknown>).syncIndexes();
      console.log("✓", name);
    }
  }
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
