import { createInsertSchema } from "drizzle-zod";
import { boolean, index, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export interface EmailAttachment {
  id?: string;
  filename: string;
  size?: number;
  contentType: string;
  contentDisposition?: string | null;
  contentId?: string | null;
  downloadUrl?: string | null;
  expiresAt?: string | null;
}

export const emailsTable = pgTable(
  "emails",
  {
    id: serial("id").primaryKey(),
    threadId: text("thread_id").notNull(),
    direction: text("direction").notNull(),
    status: text("status").notNull().default("received"),
    resendEmailId: text("resend_email_id").unique(),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    references: text("references"),
    fromAddress: text("from_address").notNull(),
    toAddress: text("to_address").notNull(),
    ccAddress: text("cc_address"),
    bccAddress: text("bcc_address"),
    subject: text("subject").notNull(),
    textBody: text("text_body"),
    htmlBody: text("html_body"),
    attachments: jsonb("attachments").$type<EmailAttachment[]>().notNull().default([]),
    isRead: boolean("is_read").notNull().default(false),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    threadIdIdx: index("emails_thread_id_idx").on(table.threadId),
    receivedAtIdx: index("emails_received_at_idx").on(table.receivedAt),
  }),
);

export const insertEmailSchema = createInsertSchema(emailsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emailsTable.$inferSelect;