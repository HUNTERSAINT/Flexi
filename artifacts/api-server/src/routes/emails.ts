import { Router } from "express";
import { Webhook } from "svix";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod/v4";
import { db, emailsTable, type EmailAttachment } from "@workspace/db";
import { requireRole } from "../middlewares/auth";
import {
  describeResendError,
  fromAddress,
  retrieveReceivedEmail,
  sendEmailThroughResend,
  textToHtml,
} from "../lib/resend";

const router = Router();

const sendEmailBodySchema = z.object({
  to: z.string().email(),
  subject: z.string().trim().min(1).max(998),
  body: z.string().min(1),
  inReplyTo: z.string().optional(),
  threadId: z.string().optional(),
  in_reply_to: z.string().optional(),
  thread_id: z.string().optional(),
});

const contactMessageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  subject: z.string().trim().max(998).optional(),
  message: z.string().trim().min(1).max(20_000),
});

type WebhookRequest = Express.Request & {
  rawBody?: Buffer;
};

type ReceivedEvent = {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string | string[];
    subject?: string;
    message_id?: string;
    in_reply_to?: string;
    thread_id?: string;
  };
};

function asAddressList(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join(", ");
  return value || "";
}

function normalizeMessageId(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/^<|>$/g, "").toLowerCase();
  return normalized || null;
}

function getHeader(
  headers: RetrievedHeaders,
  headerName: string,
): string | undefined {
  if (Array.isArray(headers)) {
    const header = headers.find(
      (entry) => entry.name?.toLowerCase() === headerName.toLowerCase(),
    );
    return header?.value;
  }
  const key = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === headerName.toLowerCase(),
  );
  return key ? headers[key] : undefined;
}

type RetrievedHeaders =
  | Record<string, string>
  | Array<{ name?: string; value?: string }>;

function publicEmail(email: typeof emailsTable.$inferSelect) {
  return email;
}

function previewText(html: string | null | undefined, text: string | null) {
  const source = text || html?.replace(/<[^>]+>/g, " ") || "";
  return source.replace(/\s+/g, " ").trim().slice(0, 220);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function threadIdFromValue(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

async function resolveThreadId(
  inReplyTo: string | null,
  suppliedThreadId: string | null,
): Promise<string> {
  if (suppliedThreadId) return suppliedThreadId;
  const normalizedReply = normalizeMessageId(inReplyTo);
  if (normalizedReply) {
    const candidates = await db
      .select({ threadId: emailsTable.threadId, messageId: emailsTable.messageId })
      .from(emailsTable)
      .where(eq(emailsTable.messageId, normalizedReply))
      .limit(1);
    if (candidates[0]?.threadId) return candidates[0].threadId;
  }
  return `thread_${crypto.randomUUID()}`;
}

async function sendAdminNotification(email: {
  id: number;
  fromAddress: string;
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
}) {
  const adminAddress = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminAddress) {
    throw new Error("ADMIN_NOTIFICATION_EMAIL is not configured");
  }
  const appUrl = process.env.PUBLIC_APP_URL || "https://flexirouteglobal.com";
  const link = `${appUrl.replace(/\/$/, "")}/admin/inbox/${email.id}`;
  const preview = previewText(email.bodyHtml, email.bodyText);
  await sendEmailThroughResend({
    from: "notifications@flexirouteglobal.com",
    to: adminAddress,
    subject: `New email from ${email.fromAddress}: ${email.subject}`,
    body: [
      `New inbound email from ${email.fromAddress}`,
      `Subject: ${email.subject}`,
      "",
      preview,
      "",
      `View it in the Flexi Route inbox: ${link}`,
    ].join("\n"),
    replyTo: email.fromAddress,
  });
}

router.post("/emails/contact", async (req, res) => {
  const parsed = contactMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "name, email, and message are required" });
    return;
  }

  const input = parsed.data;
  const subject = input.subject || "New message from the Flexi Route website";
  const threadId = `thread_${crypto.randomUUID()}`;
  const bodyText = [`Name: ${input.name}`, `Email: ${input.email}`, "", input.message].join(
    "\n",
  );

  try {
    const [saved] = await db
      .insert(emailsTable)
      .values({
        direction: "inbound",
        fromAddress: input.email,
        toAddress: process.env.ADMIN_NOTIFICATION_EMAIL || fromAddress,
        subject,
        bodyHtml: textToHtml(bodyText),
        bodyText,
        messageId: `<contact-${crypto.randomUUID()}@flexirouteglobal.com>`,
        threadId,
        attachments: [],
        status: "received",
        isRead: false,
      })
      .returning();

    try {
      await sendAdminNotification(saved);
    } catch (notificationError) {
      req.log.error(
        { err: notificationError, emailId: saved.id },
        "Contact message saved but admin notification failed",
      );
      res.status(502).json({
        error:
          "Your message was saved, but the admin notification could not be delivered. Please try again later.",
      });
      return;
    }

    res.status(201).json({ received: true, emailId: saved.id });
  } catch (error) {
    req.log.error({ err: error }, "Failed to process contact message");
    res.status(500).json({ error: "Could not send your message" });
  }
});

router.post("/emails/send", requireRole("admin"), async (req, res) => {
  const parsed = sendEmailBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "to, subject, and body are required" });
    return;
  }

  const input = parsed.data;
  const inReplyTo = normalizeMessageId(
    input.inReplyTo || input.in_reply_to || null,
  );
  const suppliedThreadId = input.threadId || input.thread_id || null;

  try {
    const threadId = await resolveThreadId(inReplyTo, suppliedThreadId);
    const sent = await sendEmailThroughResend({
      to: input.to,
      subject: input.subject,
      body: input.body,
      inReplyTo: inReplyTo || undefined,
    });
    const [saved] = await db
      .insert(emailsTable)
      .values({
        resendEmailId: sent.id,
        direction: "outbound",
        fromAddress,
        toAddress: input.to,
        subject: input.subject,
        bodyHtml: textToHtml(input.body),
        bodyText: input.body,
        messageId: sent.messageId,
        inReplyTo,
        threadId,
        attachments: [],
        status: "sent",
        isRead: true,
      })
      .returning();

    res.status(201).json(publicEmail(saved));
  } catch (error) {
    req.log.error({ err: error }, "Failed to send email through Resend");
    res.status(502).json({ error: describeResendError(error) });
  }
});

router.get("/emails/threads", requireRole("admin"), async (req, res) => {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const limit = Math.min(
      Math.max(Number.parseInt(String(req.query.limit || "50"), 10) || 50, 1),
      100,
    );
    const where = search
      ? or(
          ilike(emailsTable.subject, `%${search}%`),
          ilike(emailsTable.fromAddress, `%${search}%`),
          ilike(emailsTable.toAddress, `%${search}%`),
          ilike(emailsTable.bodyText, `%${search}%`),
        )
      : undefined;
    const messages = await db
      .select()
      .from(emailsTable)
      .where(where)
      .orderBy(desc(emailsTable.createdAt), desc(emailsTable.id))
      .limit(2000);

    const grouped = new Map<
      string,
      {
        threadId: string;
        subject: string;
        participants: Set<string>;
        latestEmail: typeof messages[number];
        unreadCount: number;
        messageCount: number;
      }
    >();

    for (const message of messages) {
      const current = grouped.get(message.threadId);
      if (current) {
        current.participants.add(message.fromAddress);
        current.participants.add(message.toAddress);
        current.unreadCount += message.isRead ? 0 : 1;
        current.messageCount += 1;
      } else {
        grouped.set(message.threadId, {
          threadId: message.threadId,
          subject: message.subject,
          participants: new Set([message.fromAddress, message.toAddress]),
          latestEmail: message,
          unreadCount: message.isRead ? 0 : 1,
          messageCount: 1,
        });
      }
    }

    const data = [...grouped.values()]
      .sort(
        (a, b) =>
          b.latestEmail.createdAt.getTime() - a.latestEmail.createdAt.getTime(),
      )
      .slice(0, limit)
      .map((thread) => ({
        threadId: thread.threadId,
        subject: thread.subject,
        participants: [...thread.participants],
        latestEmail: publicEmail(thread.latestEmail),
        unreadCount: thread.unreadCount,
        messageCount: thread.messageCount,
        lastActivityAt: thread.latestEmail.createdAt,
      }));

    res.json({ data });
  } catch (error) {
    req.log.error({ err: error }, "Failed to list email threads");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/emails/threads/:threadId", requireRole("admin"), async (req, res) => {
  try {
    const messages = await db
      .select()
      .from(emailsTable)
      .where(eq(emailsTable.threadId, String(req.params.threadId)))
      .orderBy(asc(emailsTable.createdAt), asc(emailsTable.id));
    if (messages.length === 0) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.json({
      threadId: messages[0].threadId,
      messages: messages.map(publicEmail),
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to get email thread");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch(
  "/emails/threads/:threadId",
  requireRole("admin"),
  async (req, res) => {
    try {
      await db
        .update(emailsTable)
        .set({ isRead: true })
        .where(eq(emailsTable.threadId, String(req.params.threadId)));
      res.json({ message: "Conversation marked as read" });
    } catch (error) {
      req.log.error({ err: error }, "Failed to mark email thread as read");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post("/emails/webhook", async (req, res) => {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(503).json({ error: "RESEND_WEBHOOK_SECRET is not configured" });
    return;
  }

  const rawBody = (req as WebhookRequest).rawBody;
  if (!rawBody) {
    res.status(400).json({ error: "Raw webhook body is required" });
    return;
  }

  let event: ReceivedEvent;
  try {
    const webhook = new Webhook(webhookSecret);
    event = webhook.verify(rawBody.toString("utf8"), {
      "svix-id": String(req.headers["svix-id"] || ""),
      "svix-timestamp": String(req.headers["svix-timestamp"] || ""),
      "svix-signature": String(req.headers["svix-signature"] || ""),
    }) as ReceivedEvent;
  } catch (error) {
    req.log.warn({ err: error }, "Rejected webhook with invalid signature");
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  if (event.type !== "email.received" || !event.data?.email_id) {
    res.json({ received: true });
    return;
  }

  try {
    const emailId = event.data.email_id;
    const eventData = event.data;
    const existing = await db
      .select({ id: emailsTable.id })
      .from(emailsTable)
      .where(eq(emailsTable.resendEmailId, emailId))
      .limit(1);
    if (existing.length > 0) {
      res.json({ received: true, duplicate: true });
      return;
    }

    const retrieved = await retrieveReceivedEmail(emailId);
    const headers = retrieved.headers || {};
    const messageId =
      normalizeMessageId(
        retrieved.message_id ||
          getHeader(headers, "Message-Id") ||
          eventData.message_id,
      );
    const inReplyTo = normalizeMessageId(
      retrieved.in_reply_to ||
        getHeader(headers, "In-Reply-To") ||
        eventData.in_reply_to ||
        null,
    );
    const threadId = await resolveThreadId(
      inReplyTo,
      threadIdFromValue(retrieved.thread_id || eventData.thread_id),
    );
    const attachments: EmailAttachment[] = (retrieved.attachments || []).map(
      (attachment) => ({
        filename: attachment.filename || "attachment",
        contentType:
          attachment.content_type || attachment.contentType || "application/octet-stream",
        url:
          attachment.url ||
          attachment.download_url ||
          attachment.downloadUrl ||
          null,
      }),
    );
    const [saved] = await db
      .insert(emailsTable)
      .values({
        resendEmailId: emailId,
        direction: "inbound",
        fromAddress: retrieved.from || eventData.from || "unknown",
        toAddress: asAddressList(retrieved.to || eventData.to),
        subject: retrieved.subject || eventData.subject || "(no subject)",
        bodyHtml: retrieved.html || null,
        bodyText: retrieved.text || null,
        messageId,
        inReplyTo,
        threadId,
        attachments,
        status: "received",
        isRead: false,
      })
      .returning();

    try {
      await sendAdminNotification(saved);
    } catch (notificationError) {
      req.log.error(
        { err: notificationError, emailId: saved.id },
        "Inbound email saved but admin notification failed",
      );
    }

    res.json({ received: true, emailId: saved.id });
  } catch (error) {
    req.log.error({ err: error }, "Failed to process received email webhook");
    res.status(500).json({ error: "Failed to process received email" });
  }
});

export default router;