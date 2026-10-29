# BizTracker

Point of sale and inventory app for small and medium-sized shops. React Native + TypeScript on Expo SDK 58, with Expo Router. Data stays on the device.

## Run

```bash
npm install
npm start          # Expo dev server. Press a for Android, i for iOS, w for web
npm run web        # Web preview only
npm test           # Jest: money, sales, stock, persistence, validation, export
npm run typecheck  # tsc --noEmit
npm run lint       # expo lint (ESLint)
```

`expo-image-picker`, `expo-file-system` and `expo-haptics` all ship in Expo Go, so the app runs in Expo Go without a custom build.

## Structure

```
src/
  app/                 Routes (Expo Router)
    onboarding.tsx     3 photo slides with Skip/Back/Next
    setup/             4-step wizard, review, success
    (tabs)/            Home · Sales · Inventory · Customers · More
    sale/              new (checkout), [id] (receipt + record payment)
    product/           form (create/edit), [id] (detail + stock history), adjust
    customer/          form, [id] (detail + purchase history)
    settings/          business, receipt, preferences, export, help, privacy
  domain/              Pure business logic, with no React or storage code
    types.ts           Business, settings, Product, Category, Customer, Sale, SaleItem, Payment, StockMovement
    money.ts           Integer minor-unit money, parsing, formatting, basis-point rounding
    sales.ts           priceCart, createSale, recordPayment, payment status
    catalog.ts         Products, categories, stock adjustments, customers
    analytics.ts       Revenue, COGS, gross profit, trends, low stock, customer totals
    setup.ts           Wizard draft, per-step validation, completeSetup
    exportCsv.ts       CSV builders
  data/                Data-access layer
    database.ts        Database: load, queued atomic commit, subscribe
    storage.ts         KeyValueStorage interface (AsyncStorage + in-memory test impl)
    actions.ts         The write API that screens call
    DataProvider.tsx   React context + useDb/useActions hooks
    setupDraftStore.ts Autosaved wizard progress (kept apart from business data)
  components/          Buttons, fields, sheets, dialogs, rows, states, confetti
  features/            Screen-specific pieces (setup steps, customer picker, receipt text…)
  theme/               Colour, type, spacing, radius tokens
  __tests__/           Jest tests
```

## Key decisions

- **Money is integers.** Every amount is stored in minor units (kobo for NGN, 0 decimals for XOF/XAF). User input is parsed as a string, so floats never touch it. Percentage discounts are in basis points and round half-up to the minor unit.
- **Sales snapshot history.** Each `SaleItem` stores product name, SKU, unit price and cost price as they were at sale time. Editing a product later doesn't change past figures.
- **Profit is only shown when it is known.** Gross profit = net revenue − cost of goods. If any sold item has no cost price, the app shows "Needs cost prices" instead of a number. Revenue, payments received and profit are reported separately.
- **Stock is a ledger.** Every change (opening stock, sale, adjustment with a reason) writes a `StockMovement` with before/after quantities. Product stock is never overwritten silently. A test checks that the ledger always adds up to the cached quantity.
- **Atomic writes.** The whole dataset is one JSON document written with a single `AsyncStorage.setItem`. A commit computes the next state with a pure function, persists it, and only then shows it in the UI. A failed write leaves memory and disk unchanged, so you can't get a sale without its stock movements. Commits are queued, so two quick taps can't oversell.
- **No duplicate sales.** Each checkout gets a `requestId`, and a second save with the same id is rejected. The Complete button also locks while saving.
- **Payments are recorded, not processed.** Cash (with change), bank transfer, POS and other are all entered by hand. Part-payments need a named customer, and the balance can be settled later from the receipt.

## Libraries added

| Package | Why |
|---|---|
| expo-router, react-native-screens, react-native-safe-area-context, expo-linking, expo-constants | Navigation, safe areas, deep links, app version |
| @react-native-async-storage/async-storage | Persistent local storage |
| expo-image | Cached remote onboarding photos and local images |
| expo-image-picker | Business logo and product photos |
| expo-file-system | Copies picked images out of the picker cache so they survive restarts |
| expo-haptics | Success feedback after a sale (native only) |
| @expo/vector-icons (Feather), expo-font | The one icon set used everywhere (expo-font is its required peer) |
| react-native-web, react-dom | Web preview, used for testing in a browser |
| jest, jest-expo, @types/jest | Unit tests |

## What is local-only (limitations)

- **No cloud sync, backup or multi-device use.** Data lives in this device's app storage. Deleting the app or losing the phone loses the data. Use More → Export data (CSV) to keep a copy by hand.
- **No accounts, staff roles or secure multi-user access.** Anyone who can unlock the phone can open the app. Team management appears as "Coming later".
- **Scale.** The single-document store suits one shop with thousands of products and sales. For larger datasets, put a SQLite adapter behind `KeyValueStorage`/`Database`; the domain functions stay as they are.
- Schema version is `1`. No migrations exist yet.

## Not implemented (shown honestly in the UI)

- Barcode scanning (SKU/barcode are typed in by hand and searchable)
- Tax calculation (the "prices include tax" flag only prints a note on receipts)
- Push notifications for low stock (alerts are in-app only)
- Payment-provider integrations, refunds/voids, receipt printing (receipts are shared as text)
- Changing country/currency after setup (blocked on purpose: past sales use that currency)
- Fractional quantities (e.g. 1.5 kg); quantities are whole units

## Backend readiness

Screens only talk to `useDb()` (read) and `useActions()` (write). Adding auth, a remote API or sync means swapping what is behind `data/`, and the domain logic and screens can stay as they are. Every entity has an id and timestamps, ready for future sync.

## Assets

- `assets/brand/logo.png` is a copy of the supplied `biztracker.png`, used at its original 162:172 ratio. The app icon/splash still use Expo defaults, because the supplied logo is 162×172 and app stores need a square 1024×1024 export.
- Onboarding photos come from Unsplash (Unsplash License). They load from images.unsplash.com and are cached on disk. On a first launch with no internet, the slides show a dark background with the text.
