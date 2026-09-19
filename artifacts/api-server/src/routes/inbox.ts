import express, { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, emailsTable } from "@workspace/db";
import {
  GetInboxThreadParams,
  GetInboxThreadResponse,
  ListInboxThreadsQueryParams,
  ListInboxThreadsResponse,
  MarkInboxThreadReadParams,
  MarkInboxThreadReadResponse,
  ReceiveEmailWebhookResponse,
  SendInboxEmailBody,
  SendInboxEmailResponse,
} from "@workspace/api-zod";
import { requireRole } from "../middlewares/auth";
import {
  getWebhookSecret,
  isReceivedEvent,
  isWebhookHeaderSet,
  makeWebhookHeaders,
  notifyAdminOfReceivedEmail,
  resend,
  sendStoredEmail,
  storeReceivedEmail,
} from "../lib/inbox";

const router = Router();

router.get("/admin/inbox/threads", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = ListInboxThreadsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const messages = await db
      .select()
      .from(emailsTable)
      .orderBy(desc(emailsTable.receivedAt))
      .limit(2000);
    const grouped = new Map<string, typeof messages>();
    for (const message of messages) {
      const existing = grouped.get(message.threadId) ?? [];
      existing.push(message);
      grouped.set(message.threadId, existing);
    }

    const threads = [...grouped.entries()]
      .map(([threadId, threadMessages]) => {
        const latest = threadMessages[0];
        const participants = [...new Set(threadMessages.flatMap((message) => [message.fromAddress, message.toAddress]))];
        return {
          threadId,
          subject: latest.subject,
          participants,
          preview: (latest.textBody ?? "").slice(0, 180),
          latestMessageAt: latest.receivedAt,
          unreadCount: threadMessages.filter((message) => !message.isRead).length,
          messageCount: threadMessages.length,
          latestDirection: latest.direction as "inbound" | "outbound",
        };
      })
      .filter((thread) => parsed.data.unreadOnly !== true || thread.unreadCount > 0)
      .slice(0, parsed.data.limit);

    res.json(ListInboxThreadsResponse.parse(threads));
  } catch (error) {
    req.log.error(error, "Failed to list inbox threads");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/inbox/threads/:threadId", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = GetInboxThreadParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const messages = await db
      .select()
      .from(emailsTable)
      .where(eq(emailsTable.threadId, parsed.data.threadId))
      .orderBy(emailsTable.receivedAt);
    if (messages.length === 0) {
      res.status(404).json({ error: "Email thread not found" });
      return;
    }
    res.json(GetInboxThreadResponse.parse({ threadId: parsed.data.threadId, messages }));
  } catch (error) {
    req.log.error(error, "Failed to load inbox thread");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/inbox/threads/:threadId/read", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = MarkInboxThreadReadParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    await db
      .update(emailsTable)
      .set({ isRead: true })
      .where(eq(emailsTable.threadId, parsed.data.threadId));
    res.json(MarkInboxThreadReadResponse.parse({ message: "Email thread marked as read" }));
  } catch (error) {
    req.log.error(error, "Failed to mark inbox thread read");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/inbox/send", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = SendInboxEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const email = await sendStoredEmail(parsed.data);
    res.status(201).json(SendInboxEmailResponse.parse(email));
  } catch (error) {
    req.log.error(error, "Failed to send inbox email");
    res.status(502).json({ error: "Unable to send email through Resend" });
  }
});

router.post(
  "/emails/webhook",
  express.raw({ type: "application/json", limit: "5mb" }),
  async (req, res): Promise<void> => {
    const secret = getWebhookSecret();
    const headers = makeWebhookHeaders(req.headers);
    if (!secret || !isWebhookHeaderSet(headers)) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
    let event: unknown;
    try {
      event = resend.webhooks.verify({ payload: rawBody, headers, webhookSecret: secret });
    } catch (error) {
      req.log.warn(error, "Rejected Resend webhook signature");
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    if (!isReceivedEvent(event)) {
      res.json(ReceiveEmailWebhookResponse.parse({ message: "Webhook ignored" }));
      return;
    }

    try {
      const result = await storeReceivedEmail(event.data.email_id);
      if (result.isNew) {
        try {
          await notifyAdminOfReceivedEmail(result.email);
        } catch (error) {
          req.log.error(error, "Received email saved but admin notification failed");
        }
      }
      res.json(ReceiveEmailWebhookResponse.parse({ message: result.isNew ? "Email received" : "Email already processed" }));
    } catch (error) {
      req.log.error(error, "Failed to process received email");
      res.status(500).json({ error: "Unable to process received email" });
    }
  },
);

export default router;