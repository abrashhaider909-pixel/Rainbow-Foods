import process from "node:process";
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) process.loadEnvFile(".env.local");
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not configured. Add it to .env.local.");
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  await client.connect();
  await client.db("rainbow_rewri").command({ ping: 1 });
  const count = await client.db("rainbow_rewri").collection("products").countDocuments();
  console.log(`MongoDB connection succeeded. Products collection documents: ${count}.`);
} catch (error) {
  const diagnostic = error && typeof error === "object" ? error : {};
  const cause = diagnostic.cause && typeof diagnostic.cause === "object" ? diagnostic.cause : {};
  const safeMessage = typeof diagnostic.message === "string"
    ? diagnostic.message.split(uri).join("[redacted MongoDB URI]")
    : "No driver message available";
  console.error("MongoDB connection failed:", JSON.stringify({
    name: diagnostic.name ?? "UnknownError",
    code: diagnostic.code,
    codeName: diagnostic.codeName,
    causeName: cause.name,
    causeCode: cause.code,
    message: safeMessage,
  }));
  process.exitCode = 1;
} finally {
  await client.close();
}
