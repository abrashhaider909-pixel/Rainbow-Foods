# Rainbow Foods — Full-Stack E-Commerce Platform

A production-ready full-stack e-commerce web application for **Rainbow Rewri & Foods**, built with Next.js App Router, React 19, TypeScript, and MongoDB.

---

## 🌟 Key Features

1. **Brand & Heritage Design**: Preserves Rainbow Rewri's warm visual identity (`#faf8f1`, `#244c37`, `#e8b75b`, `#c98a35`), typography, and product cards.
2. **Visitor & Customer Flow**:
   - Seamless browsing without forced login.
   - User registration and login with bcryptjs password hashing.
   - HttpOnly, secure, persistent cookie sessions (`rainbow_session`).
   - Customer Dashboard (`/account`): Overview, Order History (`/account/orders`), Saved Addresses (`/account/addresses`), Profile & Password Management (`/account/profile`).
3. **Product Catalog & Purchasing**:
   - Real-time stock tracking and low-stock indicators.
   - Promotional sale pricing and sale badges (`SALE • X% OFF`).
   - Interactive Product Quick-View modal.
   - Full shopping basket with quantity increment/decrement and price recalculation.
4. **Fulfillment Modes**:
   - **Store Pickup**: Configurable store address, instructions, pickup date selection, and time slot picker.
   - **Home Delivery**: Complete address with sector/area, city, saved address selection, instructions, and configurable delivery fee with free delivery threshold.
5. **Payment Methods**:
   - Cash on Delivery (COD) for eligible home deliveries.
   - Cash on Pickup (COP) for store pickup.
   - Online Cash Transfer (Bank Account / JazzCash / EasyPaisa) with manual verification workflow.
6. **Order Placement & Tracking**:
   - Unique order numbers (e.g. `RF-2026-XXXX`).
   - Server-side stock deduction and price verification.
   - Live Order Tracking (`/orders/[orderNumber]`): Interactive multi-step progress bar (`Pending` → `Confirmed` → `Preparing` → `Ready for Pickup / Out for Delivery` → `Completed`), order items snapshot, and store updates.
7. **Interactive Administrator Portal (`/admin`)**:
   - Server-side role authorization (`requireAdmin()`).
   - Mandatory password change on first administrator login.
   - Live MongoDB metrics: Today's orders, today's sales volume, completed revenue, unpaid/pending revenue, order pipeline counts, and low-stock alerts.
   - **Order Management**: Searchable, filterable table; status transitions; scheduled delivery dates; payment verification; customer notes & internal notes; status audit trail.
   - **Product & Inventory Management**: Add, edit, activate/deactivate, delete, and safe archive products with real-time stock and sale pricing.
   - **Customer Directory**: Customer profiles, order count, and lifetime spend statistics.
   - **Store Settings**: Pickup address, time slots, delivery charges, free delivery threshold, bank accounts, and low-stock threshold.

---

## 🔐 Administrator Account

Initial administrator credentials:
- **Email**: `admin@rainbowgmail.com`
- **Initial Password**: `123oPm78` (configurable via `ADMIN_INITIAL_PASSWORD` environment variable)
- **Role**: `admin`
- **First Login Security**: Upon first login, the administrator is prompted to update their temporary password to a private password.

---

## 🍃 MongoDB Atlas Setup Instructions

### 1. Create a MongoDB Atlas Cluster
1. Sign in or register at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a new project (e.g., `RainbowFoods`).
3. Select **Deploy a database** and choose the **M0 Free Tier** cluster in your preferred region.
4. Name your cluster (e.g. `Cluster0`) and click **Create**.

### 2. Create Database User and Configure Network Access
1. **Database Access**:
   - Go to **Database Access** under Security.
   - Click **Add New Database User**.
   - Select **Password Authentication**.
   - Username: `rainbow_admin`
   - Password: Click **Autogenerate Secure Password** or set a strong password.
   - User Privileges: Select **Read and write to any database** (or **Atlas admin**).
2. **Network Access**:
   - Go to **Network Access** under Security.
   - Click **Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`) for containerized and cloud environments.
   - Click **Confirm**.

### 3. Copy the Connection String into `.env.local`
1. Go to your cluster overview and click **Connect**.
2. Select **Drivers** (Node.js).
3. Copy the URI string:
   ```
   mongodb+srv://rainbow_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your database user password.
5. Create a `.env.local` file at the root of your project:
   ```bash
   MONGODB_URI=mongodb+srv://rainbow_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB=rainbow_rewri
   ADMIN_EMAIL=admin@rainbowgmail.com
   ADMIN_INITIAL_PASSWORD=123oPm78
   SESSION_SECRET=your_long_random_secret_string
   ```

### 4. How the Application Connects to MongoDB
- The app uses the official `mongodb` Node.js driver in `lib/mongodb.ts`.
- Connections are pooled globally (`getMongoClient()`) to prevent exhausting connection limits during serverless rendering.
- **Resilient Fallback**: If `MONGODB_URI` is not provided or MongoDB is unreachable, Rainbow Foods seamlessly activates an in-memory database store initialized with the admin account and starter products so all features work immediately in preview environments.

### 5. Collections and Indexes
The application automatically creates or uses the following MongoDB collections:
- `users`: User profiles, hashed passwords, roles (`customer` | `admin`), and saved addresses.
  - Index: `{ email: 1 }` (unique)
- `orders`: Complete order records, customer snapshot, items snapshot, totals, status history, and notes.
  - Indexes: `{ orderNumber: 1 }` (unique), `{ customerId: 1 }`, `{ createdAt: -1 }`
- `products`: Product catalog, categories, pricing, sale prices, stock counts, and active status.
  - Indexes: `{ id: 1 }` (unique), `{ slug: 1 }` (unique)
- `sessions`: Active server-side sessions.
  - Indexes: `{ token: 1 }` (unique), `{ expiresAt: 1 }` (TTL)
- `storeSettings`: Centralized store pickup, delivery fees, and bank account settings.
  - Index: `{ key: 1 }` (unique)

### 6. Seeding the Database
To initialize the MongoDB database with indexes, administrator credentials, and default products:

```bash
npm run init:db
```

This script is safe and repeatable (idempotent); it will not overwrite existing customized products, customer records, or orders.

---

## 🚀 Running the Development Server

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing User Flows

1. **Visitor Browsing**:
   - Open homepage, filter by category (`Sweets`, `Snacks`, `Meals`), search for products.
   - Click on any product card to view the detailed quick-view modal.
2. **Shopping & Checkout**:
   - Add items to the basket and adjust quantities.
   - Click **Proceed to Checkout**.
   - Test **Store Pickup** (select pickup date and time slot).
   - Test **Home Delivery** (enter street, area, city, and instructions).
   - Select payment: **Cash on Delivery** or **Online Cash Transfer** (enter TID).
   - Place order and observe redirection to live tracking page (`/orders/[orderNumber]`).
3. **Customer Account**:
   - Sign up at `/signup` or log in at `/login`.
   - Access Customer Dashboard at `/account`:
     - View active orders and full history at `/account/orders`.
     - Save and manage delivery addresses at `/account/addresses`.
     - Update password at `/account/profile`.
4. **Administrator Portal**:
   - Log in at `/admin/login` using `admin@rainbowgmail.com` and `123oPm78`.
   - Complete first-login password update.
   - View live sales metrics on the Overview dashboard (`/admin`).
   - Manage incoming orders at `/admin/orders` (advance lifecycle, verify payments, add notes).
   - Manage products at `/admin/products` (add new sweets, set sale discounts, restock).
   - View customer directory at `/admin/customers`.
   - Configure delivery charges and bank account details at `/admin/settings`.

---

## 🛡️ Production Deployment

1. Ensure `.env.local` is listed in `.gitignore` and never committed to source control.
2. In production hosting (e.g. Vercel, Cloud Run, AWS), set the environment variables:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `ADMIN_EMAIL`
   - `ADMIN_INITIAL_PASSWORD`
   - `SESSION_SECRET`
3. Build and test:
   ```bash
   npm run build
   npm run start
   ```
