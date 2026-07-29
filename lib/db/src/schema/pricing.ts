import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pricingTable = pgTable("pricing", {
  id: serial("id").primaryKey(),
  serviceType: text("service_type").notNull().unique(),
  serviceLabel: text("service_label").notNull(),
  basePriceUsd: numeric("base_price_usd").notNull(),
  pricePerKg: numeric("price_per_kg").notNull(),
  estimatedDays: text("estimated_days").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPricingSchema = createInsertSchema(pricingTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPricing = z.infer<typeof insertPricingSchema>;
export type Pricing = typeof pricingTable.$inferSelect;
