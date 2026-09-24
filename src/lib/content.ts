import { db } from "./db";
import { collectionList, destinations as defaultDestinations } from "./config";

export type CollectionItem = { slug: string; title: string; blurb: string; image: string | null };

/** Admin-managed collections, falling back to the defaults in config.ts until you add your own. */
export async function getCollections(): Promise<CollectionItem[]> {
  const rows = await db.collection.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
  return rows.length ? rows.map((r) => ({ slug: r.slug, title: r.title, blurb: r.blurb, image: r.image })) : collectionList;
}

export async function getDestinations(): Promise<string[]> {
  const rows = await db.destination.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return rows.length ? rows.map((r) => r.name) : defaultDestinations;
}
