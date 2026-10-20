import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await getMongoClient();
    const products = await client
      .db("rainbow_rewri")
      .collection("products")
      .find({})
      .sort({ id: 1 })
      .toArray();

    return NextResponse.json(products, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const diagnostic = error as {
      name?: string;
      code?: string | number;
      codeName?: string;
      message?: string;
      cause?: { name?: string; code?: string | number; message?: string };
    };
    const uri = process.env.MONGODB_URI;
    const redact = (value: string) => uri ? value.split(uri).join("[redacted MongoDB URI]") : value;
    console.error("MongoDB products API request failed", {
      name: diagnostic?.name ?? "UnknownError",
      code: diagnostic?.code,
      codeName: diagnostic?.codeName,
      message: redact(diagnostic?.message ?? ""),
      causeName: diagnostic?.cause?.name,
      causeCode: diagnostic?.cause?.code,
      causeMessage: redact(diagnostic?.cause?.message ?? ""),
    });

    return NextResponse.json(
      { error: "Products are temporarily unavailable." },
      { status: 500 },
    );
  }
}
