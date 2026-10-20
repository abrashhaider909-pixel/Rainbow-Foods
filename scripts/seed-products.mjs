
import { MongoClient } from "mongodb";

// Node does not load .env.local for standalone scripts by default.
if (!process.env.MONGODB_URI) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // The message below intentionally does not reveal environment values.
  }
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "MONGODB_URI is missing. Check your .env.local file."
  );
}

const client = new MongoClient(uri);

const products = [
  {
    id: 1,
    slug: "classic-rewri",
    name: "Classic Rewri",
    description: "Traditional sesame and jaggery goodness.",
    price: 250,
    category: "Sweets",
    image:
      "https://images.unsplash.com/photo-1605197161470-5d2c3a6e7a94?auto=format&fit=crop&w=900&q=85",
    tag: "Bestseller",
  },
  {
    id: 2,
    slug: "royal-assortment",
    name: "Royal Assortment",
    description: "A delightful selection for sharing.",
    price: 650,
    category: "Sweets",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=85",
    tag: "Customer favourite",
  },
  {
    id: 3,
    slug: "crunchy-namak-para",
    name: "Crunchy Namak Para",
    description: "Golden, crispy bites with a savoury crunch.",
    price: 450,
    category: "Snacks",
    image:
      "https://images.unsplash.com/photo-1621939514649-280e2aa2f7e3?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 4,
    slug: "family-snack-box",
    name: "Family Snack Box",
    description: "A generous box made for good company.",
    price: 850,
    category: "Snacks",
    image:
      "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=900&q=85",
    tag: "Perfect for sharing",
  },
  {
    id: 5,
    slug: "homestyle-special",
    name: "Homestyle Special",
    description: "Comforting flavours inspired by tradition.",
    price: 280,
    category: "Meals",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 6,
    slug: "festive-treat-box",
    name: "Festive Treat Box",
    description: "A thoughtful treat for every celebration.",
    price: 550,
    category: "Sweets",
    image:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=85",
  },
];

async function seedProducts() {
  try {
    await client.connect();

    const db = client.db("rainbow_rewri");
    const collection = db.collection("products");

    // Keep slugs unique to prevent duplicate products.
    await collection.createIndex(
      { slug: 1 },
      { unique: true }
    );

    for (const product of products) {
      const { slug, ...productData } = product;

      await collection.updateOne(
        { slug },
        {
          $set: {
            ...productData,
            slug,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    const count = await collection.countDocuments();

    console.log("Successfully seeded 6 products.");
    console.log("Database: rainbow_rewri");
    console.log("Collection: products");
    console.log(`Total documents in collection: ${count}`);
  } catch (error) {
    const diagnostic = error && typeof error === "object" ? error : {};
    const cause = diagnostic.cause && typeof diagnostic.cause === "object" ? diagnostic.cause : {};
    const message = typeof diagnostic.message === "string"
      ? diagnostic.message.split(uri).join("[redacted MongoDB URI]")
      : "No driver message available";
    const causeMessage = typeof cause.message === "string"
      ? cause.message.split(uri).join("[redacted MongoDB URI]")
      : undefined;
    console.error("Seeding failed:", JSON.stringify({
      name: diagnostic.name ?? "UnknownError",
      code: diagnostic.code,
      causeCode: cause.code,
      causeMessage,
      message,
    }));
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seedProducts();
