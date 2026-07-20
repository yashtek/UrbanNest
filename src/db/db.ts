import { Db, MongoClient } from "mongodb";

let database: Db | undefined;
let client: MongoClient | undefined;

export async function connectDB(): Promise<Db> {
  if (database) return database;
  const uri = Bun.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined in .env");
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  await client.connect();
  database = client.db();
  console.log("MongoDB connected");
  return database;
}

export const getDB = () => {
  if (!database) throw new Error("Database has not been connected");
  return database;
};
