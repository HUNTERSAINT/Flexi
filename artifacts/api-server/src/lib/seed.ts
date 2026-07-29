import bcrypt from "bcryptjs";
import { db, usersTable, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "nkingsley130@gmail.com";
const ADMIN_PASSWORD = "admin134";
const ADMIN_NAME = "Admin";

/**
 * Ensures the owner admin account exists and has the correct role + password.
 * Runs on every server startup — safe on both dev and production.
 * - If the account doesn't exist → creates it as admin.
 * - If the account exists but is not admin → promotes it and resets the password.
 * - If the account exists as admin → no-op.
 */
export async function seedAdminUser(): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.email, ADMIN_EMAIL))
      .limit(1);

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    if (!existing) {
      await db.insert(usersTable).values({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: "admin",
        isActive: true,
      });
      console.log("[seed] Admin account created:", ADMIN_EMAIL);
    } else if (existing.role !== "admin") {
      await db
        .update(usersTable)
        .set({ role: "admin", passwordHash, isActive: true })
        .where(eq(usersTable.id, existing.id));
      console.log("[seed] Account promoted to admin:", ADMIN_EMAIL);
    }
    // else: already admin — nothing to do
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
