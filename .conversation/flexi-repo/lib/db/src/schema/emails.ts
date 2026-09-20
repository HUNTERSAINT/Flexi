import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type EmailAttachment = {
  filename: string;
  contentType: string;
  url?: string | null;
  storagePath?: string | null;
};

export const emailDirectionEnum = pgEnum("email_direction", [
  "inbound",
  "outbound",
]);

export const emailsTable = pgTable(
  "emails",
  {
    id: serial("id").primaryKey(),
    resendEmailId: text("resend_email_id"),
    direction: emailDirectionEnum("direction").notNull(),
    fromAddress: text("from_address").notNull(),
    toAddress: text("to_address").notNull(),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html"),
    bodyText: text("body_text"),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    threadId: text("thread_id").notNull(),
    attachments: jsonb("attachments")
      .$type<EmailAttachment[]>()
      .notNull()
      .default([]),
    status: text("status").notNull().default("received"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    resendEmailIdIndex: uniqueIndex("emails_resend_email_id_idx").on(
      table.resendEmailId,
    ),
    threadIdIndex: index("emails_thread_id_idx").on(table.threadId),
    createdAtIndex: index("emails_created_at_idx").on(table.createdAt),
  }),
);

export const insertEmailSchema = createInsertSchema(emailsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emailsTable.$inferSelect;