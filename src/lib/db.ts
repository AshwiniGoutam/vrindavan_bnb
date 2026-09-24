import { MongoClient, Db, Collection, Document } from "mongodb";
import { randomUUID } from "node:crypto";

export type AnyObj = Record<string, any>;

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "vrindavan_holiday_inn";

const globalForMongo = globalThis as typeof globalThis & {
  __mongoClientPromise?: Promise<MongoClient>;
  __mongoDb?: Db;
};

async function ensureIndexes(db: Db) {
  const indexes: Array<[string, any, any?]> = [
    ["user", { email: 1 }, { unique: true }],

    ["authToken", { tokenHash: 1 }, { unique: true }],

    ["stay", { slug: 1 }, { unique: true }],

    [
      "stay",
      { icalToken: 1 },
      {
        unique: true,
        partialFilterExpression: {
          icalToken: { $type: "string" },
        },
      },
    ],

    ["booking", { code: 1 }, { unique: true }],

    [
      "booking",
      { externalRef: 1 },
      {
        unique: true,
        partialFilterExpression: {
          externalRef: { $type: "string" },
        },
      },
    ],

    [
      "booking",
      { razorpayOrderId: 1 },
      {
        unique: true,
        partialFilterExpression: {
          razorpayOrderId: { $type: "string" },
        },
      },
    ],

    ["coupon", { code: 1 }, { unique: true }],

    ["review", { bookingId: 1 }, { unique: true }],

    ["apiKey", { keyHash: 1 }, { unique: true }],

    ["siteContent", { key: 1 }, { unique: true }],
    ["blog", { slug: 1 }, { unique: true }],

    ["dayRate", { stayId: 1, date: 1 }, { unique: true }],
  ];

  await Promise.all(
    indexes.map(([collection, keys, options]) =>
      db.collection(collection).createIndex(keys, options)
    )
  );
}

async function getDatabase(): Promise<Db> {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not configured. Add your MongoDB Atlas/local connection string to .env"
    );
  }

  // Reuse already initialized database
  if (globalForMongo.__mongoDb) {
    return globalForMongo.__mongoDb;
  }

  // Create only one connection promise
  if (!globalForMongo.__mongoClientPromise) {
    const client = new MongoClient(uri);

    globalForMongo.__mongoClientPromise = client.connect();
  }

  try {
    const client = await globalForMongo.__mongoClientPromise;

    const db = client.db(dbName);

    await ensureIndexes(db);

    globalForMongo.__mongoDb = db;

    return db;
  } catch (error) {
    // Important: don't keep a failed/closed connection promise
    globalForMongo.__mongoClientPromise = undefined;
    globalForMongo.__mongoDb = undefined;

    console.error("MongoDB connection failed:", error);

    throw error;
  }
}

function values(value: any): any[] {
  return Array.isArray(value) ? value : Object.values(value ?? {});
}

function fieldCondition(condition: any): any {
  if (condition instanceof Date || condition === null || typeof condition !== "object" || Array.isArray(condition)) {
    return condition;
  }

  const out: AnyObj = {};
  if ("equals" in condition) out.$eq = condition.equals;
  if ("in" in condition) out.$in = condition.in;
  if ("notIn" in condition) out.$nin = condition.notIn;
  if ("not" in condition) out.$ne = condition.not;
  if ("gte" in condition) out.$gte = condition.gte;
  if ("gt" in condition) out.$gt = condition.gt;
  if ("lte" in condition) out.$lte = condition.lte;
  if ("lt" in condition) out.$lt = condition.lt;
  if ("has" in condition) out.$elemMatch = { $eq: condition.has };
  if ("contains" in condition) out.$regex = String(condition.contains).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if ("startsWith" in condition) out.$regex = `^${String(condition.startsWith).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`;
  if ("endsWith" in condition) out.$regex = `${String(condition.endsWith).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;

  if (condition.mode === "insensitive" && out.$regex !== undefined) out.$options = "i";
  return Object.keys(out).length ? out : condition;
}

function toMongoFilter(where: any): Document {
  if (!where) return {};
  const filter: AnyObj = {};

  if (where.AND) filter.$and = values(where.AND).map(toMongoFilter);
  if (where.OR) filter.$or = values(where.OR).map(toMongoFilter);
  if (where.NOT) filter.$nor = values(where.NOT).map(toMongoFilter);

  for (const [key, condition] of Object.entries(where)) {
    if (key === "AND" || key === "OR" || key === "NOT") continue;
    filter[key] = fieldCondition(condition);
  }
  return filter;
}

function toSort(orderBy: any): AnyObj {
  const sort: AnyObj = {};
  for (const item of Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []) {
    const [key, direction] = Object.entries(item)[0] as [string, any];
    sort[key] = direction === "desc" ? -1 : 1;
  }
  return sort;
}

const relations: Record<string, Record<string, (row: AnyObj) => Promise<AnyObj[]>>> = {
  stay: {
    bookings: async r => findRelated("booking", { stayId: r.id }),
    feeds: async r => findRelated("icalFeed", { stayId: r.id }),
    reviews: async r => findRelated("review", { stayId: r.id }),
    dayRates: async r => findRelated("dayRate", { stayId: r.id }),
  },
  user: {
    bookings: async r => findRelated("booking", { userId: r.id }),
    reviews: async r => findRelated("review", { userId: r.id }),
  },
  booking: {
    stay: async r => findRelated("stay", { id: r.stayId }),
    user: async r => findRelated("user", { id: r.userId }),
    review: async r => findRelated("review", { bookingId: r.id }),
  },
  review: {
    booking: async r => findRelated("booking", { id: r.bookingId }),
    stay: async r => findRelated("stay", { id: r.stayId }),
    user: async r => findRelated("user", { id: r.userId }),
  },
  enquiry: {
    stay: async r => findRelated("stay", { id: r.stayId }),
  },
  icalFeed: {
    blocks: async r => findRelated("externalBlock", { feedId: r.id }),
  },
  externalBlock: {
    stay: async r => findRelated("stay", { id: r.stayId }),
    feed: async r => findRelated("icalFeed", { id: r.feedId }),
  },
};

async function collectionFor(model: string): Promise<Collection<Document>> {
  return (await getDatabase()).collection(model);
}

async function findRelated(model: string, where: any): Promise<AnyObj[]> {
  const collection = await collectionFor(model);
  return collection.find(toMongoFilter(where)).toArray() as AnyObj[];
}

function project(row: AnyObj, args: any, model: string): AnyObj {
  const base = { ...row };
  delete base._id;
  return base;
}

async function applyRelations(row: AnyObj, args: any, model: string): Promise<AnyObj> {
  let out = { ...row };
  delete out._id;
  const rel = relations[model] ?? {};
  const spec = args?.include ?? args?.select;

  if (spec) {
    for (const name of Object.keys(rel)) {
      if (!spec[name]) continue;
      const rows = await rel[name](row);
      const childSpec = typeof spec[name] === "object" ? spec[name] : {};
      if (name === "review") out[name] = rows[0] ? await applyRelations(rows[0], childSpec, "review") : null;
      else if (["stay", "user", "feed", "booking"].includes(name)) out[name] = rows[0] ? await applyRelations(rows[0], childSpec, name) : null;
      else out[name] = await Promise.all(rows.map(r => applyRelations(r, childSpec, name === "feeds" ? "icalFeed" : name === "bookings" ? "booking" : name === "reviews" ? "review" : name === "dayRates" ? "dayRate" : name === "blocks" ? "externalBlock" : name)));
    }

    if (spec._count?.select) {
      out._count = {};
      for (const name of Object.keys(spec._count.select)) {
        const fn = rel[name];
        out._count[name] = fn ? (await fn(row)).length : 0;
      }
    }
  }

  if (args?.select) {
    const selected: AnyObj = {};
    for (const [key, enabled] of Object.entries(args.select)) {
      if (enabled && key !== "_count") selected[key] = row[key];
    }
    out = { ...selected, ...Object.fromEntries(Object.entries(out).filter(([k]) => k.startsWith("_") || k in rel && args.select[k])) };
    if (args.select._count) out._count = (out as any)._count;
  }

  delete out._id;
  return out;
}

function applyData(row: AnyObj, data: AnyObj) {
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      if ("increment" in value) { row[key] = (Number(row[key]) || 0) + Number(value.increment); continue; }
      if ("decrement" in value) { row[key] = (Number(row[key]) || 0) - Number(value.decrement); continue; }
      if ("set" in value) { row[key] = value.set; continue; }
    }
    row[key] = value;
  }
  row.updatedAt = new Date();
}

function uniqueFilter(where: AnyObj): Document {
  const entries = Object.entries(where ?? {});
  if (!entries.length) return {};
  const filters: AnyObj[] = [];
  for (const [key, value] of entries) {
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && key.includes("_")) {
      for (const [field, fieldValue] of Object.entries(value)) filters.push({ [field]: fieldValue });
    } else {
      filters.push({ [key]: value });
    }
  }
  return filters.length === 1 ? filters[0] : { $and: filters };
}

function createDocument(data: AnyObj): AnyObj {
  const id = data.id ?? randomUUID();
  return { ...data, id, createdAt: new Date(), updatedAt: new Date(), _id: id };
}

function makeModel(name: string) {
  return {
    findMany: async (args: any = {}) => {
      const collection = await collectionFor(name);
      let cursor = collection.find(toMongoFilter(args.where));
      if (args.orderBy) cursor = cursor.sort(toSort(args.orderBy));
      if (args.skip) cursor = cursor.skip(args.skip);
      if (args.take !== undefined) cursor = cursor.limit(Math.max(0, args.take));
      let rows = await cursor.toArray() as AnyObj[];

      if (args.distinct) {
        const seen = new Set<string>();
        rows = rows.filter(row => {
          const key = args.distinct.map((field: string) => JSON.stringify(row[field])).join("|");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      return Promise.all(rows.map(row => applyRelations(row, args, name)));
    },
    findFirst: async (args: any = {}) => {
      const rows = await makeModel(name).findMany({ ...args, take: 1 });
      return rows[0] ?? null;
    },
    findUnique: async (args: any = {}) => {
      const collection = await collectionFor(name);
      const row = await collection.findOne(uniqueFilter(args.where ?? {})) as AnyObj | null;
      return row ? applyRelations(row, args, name) : null;
    },
    count: async (args: any = {}) => {
      const collection = await collectionFor(name);
      return collection.countDocuments(toMongoFilter(args.where));
    },
    aggregate: async (args: any = {}) => {
      const collection = await collectionFor(name);
      const rows = await collection.find(toMongoFilter(args.where)).toArray() as AnyObj[];
      const out: AnyObj = {};
      if (args._count) out._count = rows.length;
      if (args._avg) {
        out._avg = {};
        for (const field of Object.keys(args._avg)) {
          const nums = rows.map(r => Number(r[field])).filter(Number.isFinite);
          out._avg[field] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
        }
      }
      return out;
    },
    create: async ({ data, include, select }: any) => {
      const collection = await collectionFor(name);
      const row = createDocument(data);
      await collection.insertOne(row);
      return applyRelations(row, { include, select }, name);
    },
    createMany: async ({ data }: any) => {
      if (!data?.length) return { count: 0 };
      const collection = await collectionFor(name);
      const rows = data.map((d: AnyObj) => createDocument(d));
      await collection.insertMany(rows);
      return { count: rows.length };
    },
    update: async ({ where, data, include, select }: any) => {
      const collection = await collectionFor(name);
      const current = await collection.findOne(uniqueFilter(where)) as AnyObj | null;
      if (!current) throw new Error(`${name} not found`);
      applyData(current, data);
      await collection.replaceOne({ _id: current._id }, current);
      return applyRelations(current, { include, select }, name);
    },
    updateMany: async ({ where, data }: any) => {
      const collection = await collectionFor(name);
      const rows = await collection.find(toMongoFilter(where)).toArray() as AnyObj[];
      for (const row of rows) {
        applyData(row, data);
        await collection.replaceOne({ _id: row._id }, row);
      }
      return { count: rows.length };
    },
    delete: async ({ where }: any) => {
      const collection = await collectionFor(name);
      const row = await collection.findOne(uniqueFilter(where)) as AnyObj | null;
      if (!row) throw new Error(`${name} not found`);
      await collection.deleteOne({ _id: row._id });
      delete row._id;
      return row;
    },
    deleteMany: async ({ where }: any = {}) => {
      const collection = await collectionFor(name);
      const result = await collection.deleteMany(toMongoFilter(where));
      return { count: result.deletedCount };
    },
    upsert: async ({ where, create, update }: any) => {
      const collection = await collectionFor(name);
      const current = await collection.findOne(uniqueFilter(where)) as AnyObj | null;
      if (current) {
        applyData(current, update);
        await collection.replaceOne({ _id: current._id }, current);
        delete current._id;
        return current;
      }
      const row = createDocument(create);
      await collection.insertOne(row);
      delete row._id;
      return row;
    },
  };
}

export const db = new Proxy({}, {
  get: (_target, property: string) => {
    if (property === "$transaction") {
      return async (operations: any) => {
        if (typeof operations === "function") return operations(db);
        return Promise.all(operations);
      };
    }
    if (property === "$connect") return () => getDatabase();
    if (property === "$disconnect") return async () => { /* keep global connection alive in Next.js */ };
    return makeModel(property);
  },
}) as any;

export type Stay = AnyObj;
export type Booking = AnyObj;
export type BookingSource = "DIRECT" | "MANUAL" | "AIRBNB" | "BOOKING_COM" | "MAKEMYTRIP" | "OTHER";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type PaymentStatus = "UNPAID" | "PAID" | "FAILED" | "REFUNDED";
export type TokenType = "VERIFY_EMAIL" | "RESET_PASSWORD";
