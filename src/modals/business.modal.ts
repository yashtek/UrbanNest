import { Collection,ObjectId } from "mongodb";
import { getDB } from "../db/db";

export const BUSINESS_TEMPLATES = [
  "PG",
  "FLAT",
  "LIBRARY",
  "HOSTEL",
  "HOTEL",
] as const;

export type BusinessTemplate = typeof BUSINESS_TEMPLATES[number];

export interface IBusiness {
  _id: ObjectId;
  owner_id: string;
  name: string;
  template: BusinessTemplate;
  created_at: Date;
}

export const businesses = (): Collection<IBusiness> =>
  getDB().collection<IBusiness>("businesses");

export async function ensureBusinessIndexes() {
  await businesses().createIndex({ owner_id: 1 });
}



