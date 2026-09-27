import "server-only";
import mongoose from "mongoose";
import { env } from "@/lib/env";

mongoose.set("strictQuery", true);

type Cache = { conn?: typeof mongoose; promise?: Promise<typeof mongoose> };
const g = globalThis as unknown as { __vhiMongoose?: Cache };
const cache: Cache = (g.__vhiMongoose ??= {});

export const isDbConfigured = () => Boolean(env().MONGODB_URI);

/** Cached connection, safe across hot reloads and serverless invocations. */
export async function connectDB() {
  if (cache.conn) return cache.conn;
  const e = env();
  if (!e.MONGODB_URI) throw new Error("MONGODB_URI is not set. Add it to .env.local (see README → MongoDB setup).");
  cache.promise ??= mongoose.connect(e.MONGODB_URI, {
    dbName: e.MONGODB_DB,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
    autoIndex: e.APP_ENV !== "production",
  });
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = undefined;
    throw err;
  }
  return cache.conn;
}

/** Run inside a MongoDB transaction (requires a replica set — MongoDB Atlas provides one). */
export async function withTransaction<T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
  await connectDB();
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
