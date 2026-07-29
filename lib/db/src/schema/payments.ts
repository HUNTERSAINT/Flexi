import { pgTable, serial, integer, numeric, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { shipmentsTable } from "./shipments";

export const cryptoCurrencyEnum = pgEnum("crypto_currency", [
  "BTC",
  "ETH",
  "USDT_TRC20",
  "USDT_ERC20",
  "USDC",
  "LTC",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "awaiting_payment",
  "under_review",
  "confirmed",
  "rejected",
]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id")
    .notNull()
    .unique()
    .references(() => shipmentsTable.id),
  amount: numeric("amount").notNull(),
  currency: cryptoCurrencyEnum("currency").notNull(),
  walletAddress: text("wallet_address").notNull(),
  txid: text("txid"),
  paymentProofUrl: text("payment_proof_url"),
  status: paymentStatusEnum("status").notNull().default("awaiting_payment"),
  adminNotes: text("admin_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
