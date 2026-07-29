import { pgTable, serial, text, integer, numeric, boolean, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "pending",
  "confirmed",
  "processing",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export const serviceTypeEnum = pgEnum("service_type", [
  "standard",
  "express",
  "overnight",
  "freight",
]);

export const shipmentsTable = pgTable("shipments", {
  id: serial("id").primaryKey(),
  trackingNumber: text("tracking_number").notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => usersTable.id),
  driverId: integer("driver_id").references(() => usersTable.id),
  serviceType: serviceTypeEnum("service_type").notNull().default("standard"),
  status: shipmentStatusEnum("status").notNull().default("pending"),
  // Origin
  originAddress: text("origin_address").notNull(),
  originCity: text("origin_city").notNull(),
  originState: text("origin_state").notNull(),
  originZip: text("origin_zip").notNull(),
  // Destination
  destinationAddress: text("destination_address").notNull(),
  destinationCity: text("destination_city").notNull(),
  destinationState: text("destination_state").notNull(),
  destinationZip: text("destination_zip").notNull(),
  // Package
  weightKg: numeric("weight_kg").notNull(),
  dimensions: text("dimensions"),
  description: text("description"),
  senderName: text("sender_name"),
  senderPhone: text("sender_phone"),
  recipientName: text("recipient_name"),
  recipientPhone: text("recipient_phone"),
  recipientEmail: text("recipient_email"),
  // Receiver pays flag
  receiverPays: boolean("receiver_pays").notNull().default(false),
  // Logistics
  estimatedDelivery: date("estimated_delivery"),
  deliveryProofUrl: text("delivery_proof_url"),
  totalAmount: numeric("total_amount"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertShipmentSchema = createInsertSchema(shipmentsTable).omit({
  id: true,
  trackingNumber: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipmentsTable.$inferSelect;
