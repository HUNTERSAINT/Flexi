/**
 * Wallet address helpers.
 * Addresses are stored in the `wallets` DB table (editable by admin at runtime).
 * This module provides a DB-backed async lookup used by the tracking route.
 */
import { db, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/** Fetch all active wallets from the DB as a currency→address map. */
export async function getWalletAddresses(): Promise<Record<string, string>> {
  const rows = await db
    .select({ currency: walletsTable.currency, address: walletsTable.address })
    .from(walletsTable)
    .where(eq(walletsTable.isActive, true));
  return Object.fromEntries(rows.map((r) => [r.currency, r.address]));
}
