import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shipmentStatusesTable = pgTable("shipment_statuses", {
  id: serial("id").primaryKey(),
  value: text("value").notNull().unique(),
  label: text("label").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertShipmentStatusSchema = createInsertSchema(shipmentStatusesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertShipmentStatus = z.infer<typeof insertShipmentStatusSchema>;
export type ShipmentStatus = typeof shipmentStatusesTable.$inferSelect;