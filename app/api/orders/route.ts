import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { validatePhoneNumber, generateOrderNumber } from "@/lib/validation";
import { DEFAULT_STORE_SETTINGS } from "@/lib/constants";
import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  StoreSettings,
} from "@/lib/types";

type SubmittedCartItem = {
  productId: number;
  quantity: number;
};

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in to view orders." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const db = await getDb();

    if (user.role === "admin") {
      const status = searchParams.get("status");
      const fulfillment = searchParams.get("fulfillment");
      const search = searchParams.get("search");
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
      const skip = (page - 1) * limit;

      const filter: Record<string, unknown> = {};
      if (status && status !== "All") filter.status = status;
      if (fulfillment && fulfillment !== "All") filter.fulfillmentMethod = fulfillment;

      let allOrders = (await db
        .collection("orders")
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray()) as unknown as Order[];

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        allOrders = allOrders.filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.customer.name.toLowerCase().includes(q) ||
            o.customer.phone.toLowerCase().includes(q) ||
            (o.customer.email && o.customer.email.toLowerCase().includes(q)),
        );
      }

      const totalCount = allOrders.length;
      const paginatedOrders = allOrders.slice(skip, skip + limit);

      return NextResponse.json({
        orders: paginatedOrders,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
      });
    }

    // Customer: return user's orders
    const orders = (await db
      .collection("orders")
      .find({ customerId: user.id })
      .sort({ createdAt: -1 })
      .toArray()) as unknown as Order[];

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const customerInput = body.customer;
    if (!customerInput || typeof customerInput !== "object") {
      return NextResponse.json({ error: "Customer details are required." }, { status: 400 });
    }

    const name = typeof customerInput.name === "string" ? customerInput.name.trim() : "";
    const phone = typeof customerInput.phone === "string" ? customerInput.phone.trim() : "";
    const email = typeof customerInput.email === "string" ? customerInput.email.trim() : "";
    const altPhone = typeof customerInput.altPhone === "string" ? customerInput.altPhone.trim() : "";

    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      return NextResponse.json({ error: phoneValidation.error || "Please enter a valid phone number." }, { status: 400 });
    }

    const fulfillmentMethod = body.fulfillmentMethod === "pickup" ? "pickup" : "delivery";
    const paymentMethod: PaymentMethod = ["cod", "cop", "transfer"].includes(body.paymentMethod)
      ? body.paymentMethod
      : fulfillmentMethod === "pickup"
        ? "cop"
        : "cod";

    // Validate fulfillment specifics
    let deliveryAddress: Order["deliveryAddress"];
    let pickupDetails: Order["pickupDetails"];

    const db = await getDb();
    const settingsDoc = (await db.collection("storeSettings").findOne({ key: "general" })) as unknown as StoreSettings || DEFAULT_STORE_SETTINGS;

    if (fulfillmentMethod === "delivery") {
      const addr = body.deliveryAddress;
      if (!addr || !addr.street || !addr.city) {
        return NextResponse.json({ error: "Street address and city are required for home delivery." }, { status: 400 });
      }
      deliveryAddress = {
        street: String(addr.street).trim(),
        area: String(addr.area || "").trim(),
        city: String(addr.city).trim(),
        instructions: String(addr.instructions || "").trim(),
      };
    } else {
      const pickup = body.pickupDetails;
      pickupDetails = {
        storeAddress: settingsDoc.pickupAddress || DEFAULT_STORE_SETTINGS.pickupAddress,
        pickupDate: String(pickup?.pickupDate || new Date().toISOString().split("T")[0]).trim(),
        pickupSlot: String(pickup?.pickupSlot || "11:00 AM - 01:00 PM").trim(),
        contactPhone: settingsDoc.storePhone || DEFAULT_STORE_SETTINGS.storePhone,
      };
    }

    // Validate cart items
    const rawItems = body.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 30) {
      return NextResponse.json({ error: "Order must contain between 1 and 30 items." }, { status: 400 });
    }

    const items = rawItems as SubmittedCartItem[];
    for (const item of items) {
      if (!item || !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        return NextResponse.json({ error: "Invalid item or quantity in basket." }, { status: 400 });
      }
    }

    // Fetch and verify products from database
    const productIds = items.map((i) => i.productId);
    const dbProducts = (await db
      .collection("products")
      .find({ id: { $in: productIds } })
      .toArray()) as unknown as Product[];

    if (dbProducts.length !== items.length) {
      return NextResponse.json({ error: "One or more items in your basket are no longer available." }, { status: 409 });
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Check stock & recalculate server-authoritative prices
    const orderItems: OrderItem[] = [];
    let subtotal = 0;
    let totalDiscount = 0;

    for (const item of items) {
      const prod = productMap.get(item.productId)!;

      if (!prod.isActive) {
        return NextResponse.json({ error: `Product "${prod.name}" is currently unavailable.` }, { status: 409 });
      }

      if (prod.stock < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${prod.name}". Only ${prod.stock} left in stock.`,
          },
          { status: 409 },
        );
      }

      const activeUnitPrice = prod.salePrice && prod.salePrice < prod.price ? prod.salePrice : prod.price;
      const lineTotal = activeUnitPrice * item.quantity;
      subtotal += lineTotal;

      if (prod.salePrice && prod.salePrice < prod.price) {
        totalDiscount += (prod.price - prod.salePrice) * item.quantity;
      }

      orderItems.push({
        productId: prod.id,
        name: prod.name,
        unitPrice: prod.price,
        salePrice: prod.salePrice,
        quantity: item.quantity,
        lineTotal,
        image: prod.image,
      });
    }

    // Calculate delivery fee
    let deliveryFee = 0;
    if (fulfillmentMethod === "delivery") {
      const freeThreshold = settingsDoc.freeDeliveryThreshold ?? 2000;
      if (freeThreshold > 0 && subtotal >= freeThreshold) {
        deliveryFee = 0;
      } else {
        deliveryFee = settingsDoc.deliveryFee ?? 150;
      }
    }

    const finalTotal = subtotal + deliveryFee;

    // Payment details for bank transfer
    let paymentDetails: Order["paymentDetails"];
    const paymentStatus: PaymentStatus = "pending";
    let initialStatus: OrderStatus = "Pending";

    if (paymentMethod === "transfer") {
      initialStatus = "Payment Verification Pending";
      const transferData = body.paymentDetails || {};
      paymentDetails = {
        transactionId: typeof transferData.transactionId === "string" ? transferData.transactionId.trim() : "",
        senderAccount: typeof transferData.senderAccount === "string" ? transferData.senderAccount.trim() : "",
        senderName: typeof transferData.senderName === "string" ? transferData.senderName.trim() : "",
        receiptNote: typeof transferData.receiptNote === "string" ? transferData.receiptNote.trim() : "",
      };
    }

    // Get current logged-in customer if any
    const user = await getCurrentUser();
    const customerId = user ? user.id : null;

    const orderNumber = generateOrderNumber();
    const nowIso = new Date().toISOString();

    const newOrder: Order = {
      orderNumber,
      customerId,
      customer: {
        name,
        phone: phoneValidation.normalized,
        email: email || (user ? user.email : undefined),
        altPhone: altPhone || undefined,
      },
      fulfillmentMethod,
      deliveryAddress,
      pickupDetails,
      items: orderItems,
      subtotal,
      discount: totalDiscount,
      deliveryFee,
      total: finalTotal,
      paymentMethod,
      paymentStatus,
      paymentDetails,
      status: initialStatus,
      statusHistory: [
        {
          status: initialStatus,
          timestamp: nowIso,
          note: paymentMethod === "transfer"
            ? "Order placed with Online Cash Transfer. Awaiting payment verification."
            : `Order placed successfully (${fulfillmentMethod === "pickup" ? "Store Pickup" : "Cash on Delivery"}).`,
          actor: "Customer",
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Deduct stock safely
    for (const item of items) {
      await db.collection("products").updateOne(
        { id: item.productId },
        { $inc: { stock: -item.quantity } },
      );
    }

    // Save order
    await db.collection("orders").insertOne(newOrder as unknown as Record<string, unknown>);

    return NextResponse.json(
      {
        orderNumber: newOrder.orderNumber,
        status: newOrder.status,
        total: newOrder.total,
        subtotal: newOrder.subtotal,
        deliveryFee: newOrder.deliveryFee,
        fulfillmentMethod: newOrder.fulfillmentMethod,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Order creation failed:", error);
    return NextResponse.json({ error: "Failed to place order. Please try again." }, { status: 500 });
  }
}
