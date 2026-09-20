import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { shipmentsTable } from "./shipments";

export const trackingEventsTable = pgTable("tracking_events", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id")
    .notNull()
    .references(() => shipmentsTable.id),
  status: text("status").notNull(),
  location: text("location"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTrackingEventSchema = createInsertSchema(trackingEventsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTrackingEvent = z.infer<typeof insertTrackingEventSchema>;
export type TrackingEvent = typeof trackingEventsTable.$inferSelect;
