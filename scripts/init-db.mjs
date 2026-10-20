import process from "node:process";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

if (!process.env.MONGODB_URI) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // ignore
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.log("ℹ️ MONGODB_URI is not set. In AI Studio, the application runs with an automatic resilient in-memory database fallback.");
  console.log("To connect to a real MongoDB Atlas cluster, set MONGODB_URI in .env.local.");
  process.exit(0);
}

const dbName = process.env.MONGODB_DB || "rainbow_rewri";
const adminEmail = (process.env.ADMIN_EMAIL || "admin@rainbowgmail.com").toLowerCase();
const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "123oPm78";

const products = [
  {
    id: 1,
    slug: "classic-rewri",
    name: "Classic Rewri",
    description: "Traditional sesame and jaggery goodness, slow-roasted according to our century-old heritage recipe.",
    price: 250,
    salePrice: null,
    discountPercent: null,
    category: "Sweets",
    image: "https://images.unsplash.com/photo-1605197161470-5d2c3a6e7a94?auto=format&fit=crop&w=900&q=85",
    tag: "Bestseller",
    stock: 45,
    isActive: true,
  },
  {
    id: 2,
    slug: "royal-assortment",
    name: "Royal Assortment",
    description: "A delightful selection of gourmet sweets, pistachios, cardamom rewri, and saffron bites for gifting and sharing.",
    price: 650,
    salePrice: 585,
    discountPercent: 10,
    category: "Sweets",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=90",
    tag: "Customer favourite",
    stock: 28,
    isActive: true,
  },
  {
    id: 3,
    slug: "crunchy-namak-para",
    name: "Crunchy Namak Para",
    description: "Golden, crispy diamond-cut bites spiced with ajwain and Himalayan pink salt. The perfect evening tea companion.",
    price: 450,
    salePrice: null,
    discountPercent: null,
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1621939514649-280e2aa2f7e3?auto=format&fit=crop&w=900&q=85",
    tag: "Crispy & Fresh",
    stock: 60,
    isActive: true,
  },
  {
    id: 4,
    slug: "family-snack-box",
    name: "Family Snack Box",
    description: "A generous box packed with assorted savory crunchies, spiced lentils, and golden crisps made for good company.",
    price: 850,
    salePrice: 765,
    discountPercent: 10,
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=900&q=85",
    tag: "Perfect for sharing",
    stock: 15,
    isActive: true,
  },
  {
    id: 5,
    slug: "homestyle-special",
    name: "Homestyle Special",
    description: "Comforting flavours inspired by tradition. Pure ingredients crafted fresh daily with wholesome heritage recipes.",
    price: 280,
    salePrice: null,
    discountPercent: null,
    category: "Meals",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
    tag: "Fresh Batch",
    stock: 20,
    isActive: true,
  },
  {
    id: 6,
    slug: "festive-treat-box",
    name: "Festive Treat Box",
    description: "A luxurious and thoughtful festive treat packed in an artisan gift box for celebrations, weddings, and joy.",
    price: 550,
    salePrice: null,
    discountPercent: null,
    category: "Sweets",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=85",
    tag: "Gift Ready",
    stock: 12,
    isActive: true,
  },
];

const defaultSettings = {
  key: "general",
  storeName: "Rainbow Rewri & Foods",
  storePhone: "+92 300 8484910",
  pickupAddress: "Shop 14, Heritage Sweet Market, Main Boulevard, Gulberg III, Lahore, Pakistan",
  pickupInstructions: "Please present your Order Number at the pickup counter. Freshly packed items will be handed over to you immediately.",
  pickupDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  pickupTimeSlots: ["11:00 AM - 01:00 PM", "02:00 PM - 04:00 PM", "04:00 PM - 06:00 PM", "06:00 PM - 09:00 PM"],
  deliveryFee: 150,
  freeDeliveryThreshold: 2000,
  deliveryAreas: ["Lahore (All Sectors)", "Gulberg", "DHA Phases 1-8", "Model Town", "Johar Town", "Cantt"],
  bankDetails: {
    bankName: "Meezan Bank Ltd",
    accountTitle: "Rainbow Rewri & Foods (Pvt) Ltd",
    accountNumber: "0284-0105829101",
    iban: "PK65MEZN0002840105829101",
    jazzCashNumber: "0300-8484910 (Rainbow Foods)",
    easyPaisaNumber: "0300-8484910 (Rainbow Foods)",
    instructions: "Please transfer the total order amount to the bank account or mobile wallet above. After transferring, enter your Transaction ID (TID) in the payment verification box.",
  },
  lowStockThreshold: 5,
  updatedAt: new Date().toISOString(),
};

async function initDatabase() {
  const client = new MongoClient(uri);
  try {
    console.log("Connecting to MongoDB Atlas…");
    await client.connect();
    const db = client.db(dbName);

    // 1. Create indexes
    console.log("Creating database indexes…");
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("orders").createIndex({ orderNumber: 1 }, { unique: true });
    await db.collection("orders").createIndex({ customerId: 1 });
    await db.collection("orders").createIndex({ createdAt: -1 });
    await db.collection("products").createIndex({ id: 1 }, { unique: true });
    await db.collection("products").createIndex({ slug: 1 }, { unique: true });
    await db.collection("sessions").createIndex({ token: 1 }, { unique: true });

    // 2. Seed Administrator
    const existingAdmin = await db.collection("users").findOne({ email: adminEmail });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await db.collection("users").insertOne({
        id: "admin-system-01",
        name: "Rainbow Store Admin",
        email: adminEmail,
        passwordHash,
        phone: "+92 300 8484910",
        role: "admin",
        mustChangePassword: true,
        savedAddresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Administrator account initialized: ${adminEmail}`);
    } else {
      console.log(`ℹ️ Administrator account already exists: ${adminEmail}`);
    }

    // 3. Seed Products
    for (const p of products) {
      await db.collection("products").updateOne(
        { slug: p.slug },
        {
          $set: {
            ...p,
            updatedAt: new Date().toISOString(),
          },
          $setOnInsert: {
            createdAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
    }
    console.log(`✅ Seeded ${products.length} products with stock and discount settings.`);

    // 4. Seed Settings
    const existingSettings = await db.collection("storeSettings").findOne({ key: "general" });
    if (!existingSettings) {
      await db.collection("storeSettings").insertOne(defaultSettings);
      console.log("✅ Default store pickup and delivery settings initialized.");
    } else {
      console.log("ℹ️ Store settings already configured.");
    }

    console.log("🎉 Database initialization completed successfully!");
  } catch (err) {
    console.error("Database initialization failed:", err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

initDatabase();
