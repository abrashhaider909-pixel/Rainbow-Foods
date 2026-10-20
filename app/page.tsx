import { Suspense } from "react";
import { getMongoClient } from "@/lib/mongodb";
import HomeClient from "./home-client";

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: "Sweets" | "Snacks" | "Meals";
  image: string;
  tag?: string;
};

async function HomeData() {
  let products: Product[] = [];
  let loadError = false;
  try {
    const client = await getMongoClient();
    products = await client
      .db("rainbow_rewri")
      .collection<Product>("products")
      .find({}, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray();
  } catch (error) {
    const diagnostic = error as { name?: string; code?: string | number };
    console.error("Homepage products query failed", {
      name: diagnostic?.name ?? "UnknownError",
      code: diagnostic?.code,
    });
    loadError = true;
  }
  return <HomeClient products={products} loadError={loadError} />;
}

export default function Home() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#faf8f1] px-5 py-24 text-center text-[#244c37]"><h1 className="font-serif text-3xl">Preparing today&apos;s menu…</h1></main>}>
      <HomeData />
    </Suspense>
  );
}
