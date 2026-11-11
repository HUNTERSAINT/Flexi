import bcrypt from "bcryptjs";
import { db, pricingTable, shipmentStatusesTable, usersTable, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// Admin login comes from environment variables, never from source code.
// Set FLEXI_ADMIN_EMAIL and FLEXI_ADMIN_PASSWORD (10+ characters) on the server.
const ADMIN_EMAIL = process.env["FLEXI_ADMIN_EMAIL"]?.trim();
const ADMIN_PASSWORD = process.env["FLEXI_ADMIN_PASSWORD"];
const ADMIN_NAME = "Admin";

export const DEFAULT_SHIPMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "in_transit", label: "In Transit" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "arrived_at_location", label: "Arrived at location" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export async function seedShipmentStatuses(): Promise<void> {
  try {
    for (const status of DEFAULT_SHIPMENT_STATUSES) {
      await db.insert(shipmentStatusesTable).values({ ...status, isSystem: true }).onConflictDoNothing({
        target: shipmentStatusesTable.value,
      });
    }
  } catch (err) {
    logger.error({ err }, "Could not seed shipment statuses");
  }
}

/**
 * Ensures the owner admin account exists with the credentials configured in
 * FLEXI_ADMIN_EMAIL / FLEXI_ADMIN_PASSWORD. Runs on every server startup.
 * - If either variable is missing (or the password is under 10 characters) →
 *   admin seeding is skipped and nothing is changed.
 * - If the account doesn't exist → creates it as admin.
 * - If the account exists → makes sure it is an active admin and that its
 *   password matches FLEXI_ADMIN_PASSWORD (the variable is the source of truth;
 *   change the password by changing the variable and redeploying).
 */
export async function seedAdminUser(): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10) {
    console.warn(
      "[seed] Admin seeding skipped: set FLEXI_ADMIN_EMAIL and FLEXI_ADMIN_PASSWORD (10+ characters).",
    );
    return;
  }

  try {
    const [existing] = await db
      .select({ id: usersTable.id, role: usersTable.role, passwordHash: usersTable.passwordHash, isActive: usersTable.isActive })
      .from(usersTable)
      .where(eq(usersTable.email, ADMIN_EMAIL))
      .limit(1);

    if (!existing) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.insert(usersTable).values({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: "admin",
        isActive: true,
      });
      console.log("[seed] Admin account created:", ADMIN_EMAIL);
      return;
    }

    const passwordMatches = await bcrypt.compare(ADMIN_PASSWORD, existing.passwordHash);
    if (existing.role !== "admin" || !existing.isActive || !passwordMatches) {
      const passwordHash = passwordMatches ? existing.passwordHash : await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db
        .update(usersTable)
        .set({ role: "admin", passwordHash, isActive: true })
        .where(eq(usersTable.id, existing.id));
      console.log("[seed] Admin account synchronized from environment:", ADMIN_EMAIL);
    }
  } catch (err) {
    console.error("[seed] Could not seed admin user:", err);
  }
}

const DEFAULT_WALLETS = [
  { currency: "BTC",       label: "Bitcoin",         network: "Bitcoin Network",  address: process.env.WALLET_BTC       || "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf1d" },
  { currency: "ETH",       label: "Ethereum",        network: "ERC-20",           address: process.env.WALLET_ETH       || "0x742d35Cc6634C0532925a3b8D4C9E6B9d5b8f2E1" },
  { currency: "USDT_TRC20",label: "Tether (TRC-20)", network: "TRC-20 (Tron)",   address: process.env.WALLET_USDT_TRC20|| "TKFLszWprxEjE5KGYne2rhu9zQmFp6YAVQ" },
  { currency: "USDT_ERC20",label: "Tether (ERC-20)", network: "ERC-20",           address: process.env.WALLET_USDT_ERC20|| "0x742d35Cc6634C0532925a3b8D4C9E6B9d5b8f2E1" },
  { currency: "USDC",      label: "USD Coin",        network: "ERC-20",           address: process.env.WALLET_USDC      || "0x742d35Cc6634C0532925a3b8D4C9E6B9d5b8f2E1" },
  { currency: "LTC",       label: "Litecoin",        network: "Litecoin Network", address: process.env.WALLET_LTC       || "LZ2sVFXBt1zP4UL8PGzQa9UPvK1YBDJ3Hb" },
  { currency: "XRP",       label: "XRP",             network: "XRP Ledger",       address: process.env.WALLET_XRP       || "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh" },
];

/**
 * Ensures every supported crypto wallet has a row in the wallets table.
 * Uses INSERT ... ON CONFLICT DO NOTHING so existing admin edits are preserved.
 */
export async function seedWallets(): Promise<void> {
  try {
    for (const wallet of DEFAULT_WALLETS) {
      await db
        .insert(walletsTable)
        .values({ ...wallet, isActive: true })
        .onConflictDoNothing({ target: walletsTable.currency });
    }
  } catch (err) {
    console.error("[seed] Could not seed wallets:", err);
  }
}

const DEFAULT_PRICING = [
  {
    serviceType: "standard",
    serviceLabel: "Standard",
    basePriceUsd: "15",
    pricePerKg: "2.5",
    estimatedDays: "5–7 business days",
    description: "Reliable delivery for everyday shipments.",
  },
  {
    serviceType: "express",
    serviceLabel: "Express",
    basePriceUsd: "30",
    pricePerKg: "4",
    estimatedDays: "2–3 business days",
    description: "Faster delivery when timing matters.",
  },
  {
    serviceType: "overnight",
    serviceLabel: "Overnight",
    basePriceUsd: "55",
    pricePerKg: "6",
    estimatedDays: "Next business day",
    description: "Priority overnight delivery for urgent shipments.",
  },
  {
    serviceType: "freight",
    serviceLabel: "Freight",
    basePriceUsd: "100",
    pricePerKg: "1.5",
    estimatedDays: "7–14 business days",
    description: "Cost-effective delivery for larger shipments.",
  },
] as const;

/**
 * Ensures each selectable service has a pricing row.
 * Existing admin-managed values are preserved.
 */
export async function seedPricing(): Promise<void> {
  try {
    for (const pricing of DEFAULT_PRICING) {
      await db
        .insert(pricingTable)
        .values(pricing)
        .onConflictDoNothing({ target: pricingTable.serviceType });
    }
  } catch (err) {
    logger.error({ err }, "Could not seed pricing");
  }
}
