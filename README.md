# Radical Engineering - Order Management App

A React Native & Expo mobile application designed for **Radical Engineering** store managers and sales staff to manage customer orders in real-time, update fulfillment statuses, generate branded invoices, and receive incoming order notifications directly connected to **Directus**.

---

## 🚀 Key Features

1. **Directus Real-Time Order Feed**:
   - Fetches and syncs with Directus collection `orders` and related `order_items` / `products`.
   - Filter orders by status: **All, Pending, Confirmed, Processing, Shipped, Delivered, Cancelled**.
   - Search by Order ID, Customer Name, or Phone Number.
   - Pull-to-refresh & auto-sync active polling.

2. **Instant Order Notifications & Alerts**:
   - Automatic polling engine checks Directus every 25 seconds for new orders.
   - Triggers native sound, vibration haptics (`expo-haptics`), and system push notifications (`expo-notifications`).
   - Badges in top header and bottom tabs indicating unread/new orders needing action.

3. **1-Tap Order Status Transitions**:
   - Quick status update modal to move orders along the pipeline:
     - `pending` ➔ `confirmed` ➔ `processing` ➔ `shipped` ➔ `delivered` (or `cancelled`).
   - Optimistic UI updates with instant Directus SDK persistence.

4. **Invoice Engine (PDF, Print & WhatsApp Sharing)**:
   - Matches the Radical Engineering web invoice layout with official company branding, header, Kishoreganj hotline numbers, and BDT currency formatting.
   - Direct wireless printing via `expo-print`.
   - Native OS share sheet (`expo-sharing`) to send the generated PDF to customers via **WhatsApp**, Email, or save to Drive.

5. **Customer Quick Actions**:
   - 1-tap direct phone call (`tel:`).
   - 1-tap WhatsApp chat with pre-filled greeting and order ID.
   - 1-tap SMS.

6. **Extra Charges & Adjustments**:
   - Ability to add delivery fees, solar installation labor, or adjustments to an order, automatically recalculating and updating the total in Directus.

7. **Sales & Analytics Overview**:
   - Total revenue, average order value, pending action count, and status breakdown progress bars.

---

## 🛠️ Tech Stack

- **Framework**: React Native 0.86 / Expo SDK 57 (TypeScript)
- **Backend**: Directus SDK (`@directus/sdk`)
- **Navigation**: React Navigation Native Stack & Bottom Tabs
- **Notifications & Haptics**: `expo-notifications`, `expo-haptics`
- **PDF & Invoice**: `expo-print`, `expo-sharing`
- **Package Manager**: `pnpm`

---

## 📦 Getting Started

### 1. Environment Configuration
The `.env` file is already preconfigured in the project root:

```env
EXPO_PUBLIC_SITE_URL=https://radicalengineering.com.bd/
EXPO_PUBLIC_API_URL=https://admin.atiar.com.bd/
EXPO_PUBLIC_ASSETS_URL=https://admin.atiar.com.bd/assets/
EXPO_PUBLIC_ACCESS_TOKEN=tlaoVoH-cJOVcNpAadhVFGQzHmAO3W5y
```

### 2. Run the App

```bash
# Start Metro bundler (scan QR code with Expo Go app on Android/iOS)
pnpm start

# Run on Android emulator / connected USB device
pnpm android

# Run on iOS simulator
pnpm ios

# Run web preview
pnpm web
```

---

## 📁 Project Structure

```
├── App.tsx                     # Main root component & providers
├── app.json                    # Expo configuration & plugins
├── package.json                # Dependencies and scripts
├── .env                        # Directus API credentials
├── assets/                     # Brand icons, logo, splash screen
└── src/
    ├── constants/
    │   ├── config.ts           # App URLs, hotline, company details
    │   └── theme.ts            # Brand colors (#3C1100, #FCB974), status map
    ├── types/
    │   └── index.ts            # Order, OrderItem, Product, Status types
    ├── services/
    │   ├── directus.ts         # Directus SDK client instance
    │   ├── ordersApi.ts        # Orders CRUD & query methods
    │   ├── notifications.ts    # Expo notifications & haptic trigger
    │   └── invoiceService.ts   # Invoice HTML, PDF generation & sharing
    ├── context/
    │   └── OrdersContext.tsx   # Global orders state, polling & metrics
    ├── components/
    │   ├── OrderCard.tsx       # Order preview item card with quick actions
    │   ├── StatusBadge.tsx     # Color-coded status badge with icons
    │   ├── StatusChangeModal.tsx # Bottom modal for status update
    │   └── ExtraChargesModal.tsx # Modal for adding delivery/service fees
    ├── screens/
    │   ├── OrdersListScreen.tsx  # Dashboard list with search & filter tabs
    │   ├── OrderDetailScreen.tsx # Full order info, contact buttons, invoice
    │   ├── AnalyticsScreen.tsx   # Sales charts & status breakdown
    │   └── SettingsScreen.tsx    # Notifications test, polling toggle, config
    └── navigation/
        ├── AppNavigator.tsx    # Native Stack + Bottom Tabs
        └── types.ts            # Screen route parameter types
```

