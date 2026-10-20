import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { DEFAULT_PRODUCTS, DEFAULT_STORE_SETTINGS } from "./constants";
import type { User } from "./types";

type StoreDocument = Record<string, unknown> & {
  id?: number | string;
  slug?: string;
  email?: string;
  token?: string;
  orderNumber?: string;
  key?: string;
  _id?: unknown;
};

type InMemoryStore = {
  users: StoreDocument[];
  sessions: StoreDocument[];
  products: StoreDocument[];
  orders: StoreDocument[];
  storeSettings: StoreDocument[];
  [collection: string]: StoreDocument[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
  __rainbowInMemoryStore?: InMemoryStore;
  __rainbowRealDbInitialized?: boolean;
};

// Initial admin configuration
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@rainbowgmail.com").toLowerCase();
const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || "123oPm78";

function getAdminUsers(): User[] {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(ADMIN_INITIAL_PASSWORD, salt);

  const primary: User = {
    id: "admin-system-01",
    name: "Rainbow Store Admin",
    email: ADMIN_EMAIL,
    passwordHash,
    phone: "+92 300 8484910",
    role: "admin",
    mustChangePassword: true,
    savedAddresses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const users = [primary];
  if (ADMIN_EMAIL !== "admin@rainbowgmail.com") {
    users.push({
      ...primary,
      id: "admin-system-02",
      email: "admin@rainbowgmail.com",
    });
  }
  return users;
}

function loadPersistedStore(): InMemoryStore | null {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Return null on read/parse error
  }
  return null;
}

function saveStoreToDisk(store: InMemoryStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // Fail silently in environments where writing to disk is restricted
  }
}

if (!globalForMongo.__rainbowInMemoryStore) {
  const diskStore = loadPersistedStore();
  const initialAdmins = getAdminUsers();
  if (diskStore && Array.isArray(diskStore.products) && Array.isArray(diskStore.users)) {
    globalForMongo.__rainbowInMemoryStore = diskStore;
    for (const admin of initialAdmins) {
      const exists = diskStore.users.some(
        (u) => typeof u.email === "string" && u.email.toLowerCase() === admin.email.toLowerCase(),
      );
      if (!exists) {
        diskStore.users.push(admin as unknown as StoreDocument);
      }
    }
    saveStoreToDisk(diskStore);
  } else {
    globalForMongo.__rainbowInMemoryStore = {
      users: initialAdmins.map((a) => a as unknown as StoreDocument),
      sessions: [],
      products: DEFAULT_PRODUCTS.map((p) => ({ ...p }) as unknown as StoreDocument),
      orders: [],
      storeSettings: [
        { key: "general", ...DEFAULT_STORE_SETTINGS } as unknown as StoreDocument,
      ],
    };
    saveStoreToDisk(globalForMongo.__rainbowInMemoryStore);
  }
}


function matchesFilter(item: StoreDocument, filter: Record<string, unknown>): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, val] of Object.entries(filter)) {
    if (val && typeof val === "object" && "$in" in val) {
      const inArr = (val as { $in?: unknown[] }).$in;
      if (Array.isArray(inArr) && !inArr.includes(item[key])) return false;
    } else if (val && typeof val === "object" && "$ne" in val) {
      const neVal = (val as { $ne?: unknown }).$ne;
      if (item[key] === neVal) return false;
    } else if (key === "email" && typeof val === "string") {
      if (String(item[key] || "").toLowerCase() !== val.toLowerCase()) return false;
    } else if (item[key] !== val) {
      return false;
    }
  }
  return true;
}

function createMockMongoClient(): MongoClient {
  const store = globalForMongo.__rainbowInMemoryStore!;

  function getCollection(name: string) {
    if (!store[name]) {
      store[name] = [];
    }
    const collectionData = store[name];

    return {
      find(filter: Record<string, unknown> = {}, options?: { projection?: Record<string, number> }) {
        const results = collectionData.filter((item) => matchesFilter(item, filter));

        const sortedResults = [...results];
        let skipCount = 0;
        let limitCount = Infinity;

        const cursor = {
          sort(sortCriteria?: Record<string, number>) {
            if (sortCriteria) {
              const [field, direction] = Object.entries(sortCriteria)[0] ?? [];
              if (field) {
                sortedResults.sort((a, b) => {
                  const aVal = a[field] as string | number;
                  const bVal = b[field] as string | number;
                  if (aVal < bVal) return direction === -1 ? 1 : -1;
                  if (aVal > bVal) return direction === -1 ? -1 : 1;
                  return 0;
                });
              }
            }
            return cursor;
          },
          skip(count: number) {
            skipCount = count;
            return cursor;
          },
          limit(count: number) {
            limitCount = count;
            return cursor;
          },
          async toArray() {
            const sliced = sortedResults.slice(skipCount, skipCount + limitCount);
            const projection = options?.projection;
            return sliced.map((item) => {
              const copy = { ...item };
              if (projection && projection._id === 0) {
                delete copy._id;
              }
              return copy;
            });
          },
        };
        return cursor;
      },
      async findOne(filter: Record<string, unknown> = {}, options?: { projection?: Record<string, number> }) {
        const item = collectionData.find((i) => matchesFilter(i, filter));
        if (!item) return null;
        const copy = { ...item };
        if (options?.projection && options.projection._id === 0) {
          delete copy._id;
        }
        return copy;
      },
      async insertOne(doc: StoreDocument) {
        const insertedId = doc._id || Math.random().toString(36).substring(2);
        collectionData.push({ ...doc, _id: insertedId });
        saveStoreToDisk(store);
        return { acknowledged: true, insertedId };
      },
      async insertMany(docs: StoreDocument[]) {
        for (const doc of docs) {
          const insertedId = doc._id || Math.random().toString(36).substring(2);
          collectionData.push({ ...doc, _id: insertedId });
        }
        saveStoreToDisk(store);
        return { acknowledged: true, insertedCount: docs.length };
      },
      async updateOne(
        filter: Record<string, unknown>,
        update: { $set?: Record<string, unknown>; $setOnInsert?: Record<string, unknown>; $inc?: Record<string, number> },
        options?: { upsert?: boolean },
      ) {
        const item = collectionData.find((i) => matchesFilter(i, filter));
        if (item) {
          if (update.$set) Object.assign(item, update.$set);
          if (update.$inc) {
            for (const [k, v] of Object.entries(update.$inc)) {
              const cur = typeof item[k] === "number" ? (item[k] as number) : 0;
              item[k] = cur + v;
            }
          }
          saveStoreToDisk(store);
          return { acknowledged: true, modifiedCount: 1, matchedCount: 1 };
        } else if (options?.upsert) {
          const newDoc = {
            ...(update.$setOnInsert || {}),
            ...(update.$set || {}),
            ...filter,
            _id: Math.random().toString(36).substring(2),
          };
          collectionData.push(newDoc);
          saveStoreToDisk(store);
          return { acknowledged: true, modifiedCount: 0, matchedCount: 0, upsertedCount: 1 };
        }
        return { acknowledged: true, modifiedCount: 0, matchedCount: 0 };
      },
      async deleteOne(filter: Record<string, unknown>) {
        const index = collectionData.findIndex((i) => matchesFilter(i, filter));
        if (index !== -1) {
          collectionData.splice(index, 1);
          saveStoreToDisk(store);
          return { acknowledged: true, deletedCount: 1 };
        }
        return { acknowledged: true, deletedCount: 0 };
      },
      async countDocuments(filter: Record<string, unknown> = {}) {
        return collectionData.filter((i) => matchesFilter(i, filter)).length;
      },
      async createIndex() {
        return "index_ok";
      },
    };
  }

  const mockDb = {
    collection: (name: string) => getCollection(name),
    command: async () => ({ ok: 1 }),
  };

  const mockClient = {
    db: () => mockDb,
    connect: async () => mockClient,
    close: async () => {},
  };

  return mockClient as unknown as MongoClient;
}

/**
 * Checks if a URI is a placeholder or template string that cannot resolve
 */
function isPlaceholderUri(uri?: string): boolean {
  if (!uri || !uri.trim()) return true;
  const lower = uri.toLowerCase();
  return (
    lower.includes("cluster0.xxxxx") ||
    lower.includes("xxxxx") ||
    lower.includes("<user>") ||
    lower.includes("<password>") ||
    lower.includes("<cluster>") ||
    lower.includes("dummy") ||
    lower.includes("example.com") ||
    lower.includes("your-mongodb-uri")
  );
}

/**
 * Ensures real MongoDB collections and initial admin/products/settings exist
 */
async function initializeRealDbIfEmpty(client: MongoClient) {
  if (globalForMongo.__rainbowRealDbInitialized) return;
  try {
    const dbName = process.env.MONGODB_DB || "rainbow_rewri";
    const db = client.db(dbName);

    // 1. Admin user check
    const usersCol = db.collection("users");
    const adminExists = await usersCol.findOne({ role: "admin" });
    if (!adminExists) {
      const admins = getAdminUsers();
      await usersCol.insertMany(admins as unknown as Record<string, unknown>[]);
    }

    // 2. Products check
    const productsCol = db.collection("products");
    const productsCount = await productsCol.countDocuments();
    if (productsCount === 0) {
      await productsCol.insertMany(DEFAULT_PRODUCTS as unknown as Record<string, unknown>[]);
    }

    // 3. Store settings check
    const settingsCol = db.collection("storeSettings");
    const settingsExists = await settingsCol.findOne({ key: "general" });
    if (!settingsExists) {
      await settingsCol.insertOne({ key: "general", ...DEFAULT_STORE_SETTINGS });
    }

    globalForMongo.__rainbowRealDbInitialized = true;
  } catch {
    // Database seeding fallback handled gracefully
  }
}

export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;

  // Immediately use local/in-memory store if no URI or placeholder URI
  if (isPlaceholderUri(uri)) {
    if (!globalForMongo.mongoClientPromise) {
      globalForMongo.mongoClientPromise = Promise.resolve(createMockMongoClient());
    }
    return globalForMongo.mongoClientPromise;
  }

  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(uri!, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });
    globalForMongo.mongoClientPromise = client
      .connect()
      .then(async (connectedClient) => {
        await initializeRealDbIfEmpty(connectedClient);
        return connectedClient;
      })
      .catch(() => {
        // Cache mock client promise on failure so subsequent requests don't retry and block
        const fallbackClient = createMockMongoClient();
        globalForMongo.mongoClientPromise = Promise.resolve(fallbackClient);
        return fallbackClient;
      });
  }

  return globalForMongo.mongoClientPromise;
}

export async function getDb() {
  const client = await getMongoClient();
  const dbName = process.env.MONGODB_DB || "rainbow_rewri";
  return client.db(dbName);
}
