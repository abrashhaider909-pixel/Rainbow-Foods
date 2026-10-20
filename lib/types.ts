export type UserRole = "customer" | "admin";

export interface SavedAddress {
  id: string;
  title: string; // e.g. "Home", "Office"
  street: string;
  area: string;
  city: string;
  notes?: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  role: UserRole;
  mustChangePassword?: boolean;
  savedAddresses: SavedAddress[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  mustChangePassword?: boolean;
}

export type ProductCategory = "Sweets" | "Snacks" | "Meals";

export interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number | null;
  discountPercent?: number | null;
  category: ProductCategory;
  image: string;
  tag?: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  unitPrice: number;
  salePrice?: number | null;
  quantity: number;
  lineTotal: number;
  image?: string;
}

export type FulfillmentMethod = "delivery" | "pickup";

export interface DeliveryDetails {
  street: string;
  area: string;
  city: string;
  instructions?: string;
}

export interface PickupDetails {
  storeAddress: string;
  pickupDate: string;
  pickupSlot: string;
  contactPhone: string;
}

export type PaymentMethod = "cod" | "cop" | "transfer";
export type PaymentStatus = "pending" | "verified" | "paid" | "failed";

export interface PaymentDetails {
  transactionId?: string;
  senderAccount?: string;
  senderName?: string;
  receiptNote?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export type OrderStatus =
  | "Pending"
  | "Payment Verification Pending"
  | "Confirmed"
  | "Preparing"
  | "Ready for Pickup"
  | "Out for Delivery"
  | "Completed"
  | "Cancelled";

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  actor: string; // 'Customer' | 'Admin: <name>' | 'System'
}

export interface Order {
  id?: string;
  orderNumber: string;
  customerId?: string | null;
  customer: {
    name: string;
    phone: string;
    email?: string;
    altPhone?: string;
  };
  fulfillmentMethod: FulfillmentMethod;
  deliveryAddress?: DeliveryDetails;
  pickupDetails?: PickupDetails;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDetails?: PaymentDetails;
  status: OrderStatus;
  expectedDate?: string;
  statusHistory: StatusHistoryEntry[];
  internalNotes?: string;
  customerNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettings {
  storeName: string;
  storePhone: string;
  pickupAddress: string;
  pickupInstructions: string;
  pickupDays: string[];
  pickupTimeSlots: string[];
  deliveryFee: number;
  freeDeliveryThreshold: number;
  deliveryAreas: string[];
  bankDetails: {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
    jazzCashNumber?: string;
    easyPaisaNumber?: string;
    instructions?: string;
  };
  lowStockThreshold: number;
  updatedAt: string;
}
