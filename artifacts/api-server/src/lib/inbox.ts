import { randomUUID } from "node:crypto";
import { and, desc, eq, or } from "drizzle-orm";
import { Resend, type CreateEmailOptions } from "resend";
import { db, emailsTable, type Email, type EmailAttachment } from "@workspace/db";
import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? "";
const OUTBOUND_FROM = process.env.EMAIL_FROM ?? "Flexi Route <support@flexirouteglobal.com>";
const NOTIFICATION_FROM = "Flexi Route Notifications <notifications@flexirouteglobal.com>";
const APP_URL = process.env.APP_URL ?? "https://flexirouteglobal.com";

// The SDK throws during construction when no key is present. Keep the server
// bootable in local environments; calls still fail explicitly until configured.
export const resend = new Resend(RESEND_API_KEY || "re_placeholder");

export interface InboxEmailInput {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  threadId?: string;
  inReplyTo?: string;
}

function splitAddresses(value?: string): string[] | undefined {
  if (!value) return undefined;
  return value.split(",").map((address) => address.trim()).filter(Boolean);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(value: string): string {
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;white-space:pre-wrap;">${escapeHtml(value)}</div>`;
}

function headerValue(headers: Record<string, string> | null | undefined, name: string): string | null {
  if (!headers) return null;
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : null;
}

function formatAttachments(attachments: Array<{
  id?: string;
  filename?: string | null;
  size?: number;
  content_type?: string;
  content_disposition?: string | null;
  content_id?: string | null;
  download_url?: string | null;
  expires_at?: string | null;
}>): EmailAttachment[] {
  return attachments.map((attachment) => ({
    id: attachment.id,
    filename: attachment.filename ?? "attachment",
    size: attachment.size,
    contentType: attachment.content_type ?? "application/octet-stream",
    contentDisposition: attachment.content_disposition,
    contentId: attachment.content_id,
    downloadUrl: attachment.download_url,
    expiresAt: attachment.expires_at,
  }));
}

async function findThreadByMessageId(messageId: string | null): Promise<string | null> {
  if (!messageId) return null;
  const [match] = await db
    .select({ threadId: emailsTable.threadId })
    .from(emailsTable)
    .where(or(eq(emailsTable.messageId, messageId), eq(emailsTable.inReplyTo, messageId)))
    .limit(1);
  return match?.threadId ?? null;
}

async function resolveThreadId(threadId: string | undefined, inReplyTo: string | null): Promise<string> {
  if (threadId) return threadId;
  return (await findThreadByMessageId(inReplyTo)) ?? `thread-${randomUUID()}`;
}

export async function sendStoredEmail(
  input: InboxEmailInput,
  options: { from?: string; isRead?: boolean } = {},
): Promise<Email> {
  const messageId = `<flexi-${randomUUID()}@flexirouteglobal.com>`;
  const references = input.inReplyTo ? input.inReplyTo : undefined;
  const payload: CreateEmailOptions = {
    from: options.from ?? OUTBOUND_FROM,
    to: input.to,
    cc: splitAddresses(input.cc),
    bcc: splitAddresses(input.bcc),
    replyTo: OUTBOUND_FROM,
    subject: input.subject,
    text: input.textBody,
    html: input.htmlBody ?? textToHtml(input.textBody),
    headers: {
      "Message-ID": messageId,
      ...(input.inReplyTo ? { "In-Reply-To": input.inReplyTo, References: references ?? input.inReplyTo } : {}),
    },
  };

  const response = await resend.emails.send(payload);
  if (response.error || !response.data?.id) {
    throw new Error(response.error?.message ?? "Resend did not return an email id");
  }

  const resolvedThreadId = await resolveThreadId(input.threadId, input.inReplyTo ?? null);
  const [stored] = await db
    .insert(emailsTable)
    .values({
      threadId: resolvedThreadId,
      direction: "outbound",
      status: "sent",
      resendEmailId: response.data.id,
      messageId,
      inReplyTo: input.inReplyTo,
      references,
      fromAddress: options.from ?? OUTBOUND_FROM,
      toAddress: input.to,
      ccAddress: input.cc,
      bccAddress: input.bcc,
      subject: input.subject,
      textBody: input.textBody,
      htmlBody: input.htmlBody ?? textToHtml(input.textBody),
      attachments: [],
      isRead: options.isRead ?? true,
    })
    .returning();

  return stored;
}

export async function storeReceivedEmail(emailId: string): Promise<{ email: Email; isNew: boolean }> {
  const [existing] = await db
    .select()
    .from(emailsTable)
    .where(eq(emailsTable.resendEmailId, emailId))
    .limit(1);
  if (existing) return { email: existing, isNew: false };

  const response = await resend.emails.receiving.get(emailId, { html_format: "cid" });
  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "Unable to retrieve received email from Resend");
  }

  const received = response.data;
  const inReplyTo = headerValue(received.headers, "in-reply-to");
  const references = headerValue(received.headers, "references");
  const threadId = await resolveThreadId(undefined, inReplyTo ?? references?.split(/\s+/).at(-1) ?? null);
  const receivedAt = new Date(received.created_at);
  const [stored] = await db
    .insert(emailsTable)
    .values({
      threadId,
      direction: "inbound",
      status: "received",
      resendEmailId: received.id,
      messageId: received.message_id,
      inReplyTo,
      references,
      fromAddress: received.from,
      toAddress: received.to.join(", "),
      ccAddress: received.cc?.join(", ") ?? null,
      bccAddress: received.bcc?.join(", ") ?? null,
      subject: received.subject,
      textBody: received.text,
      htmlBody: received.html,
      attachments: formatAttachments(received.attachments),
      isRead: false,
      receivedAt,
    })
    .onConflictDoNothing({ target: emailsTable.resendEmailId })
    .returning();

  if (stored) return { email: stored, isNew: true };

  const [raceWinner] = await db
    .select()
    .from(emailsTable)
    .where(eq(emailsTable.resendEmailId, emailId))
    .limit(1);
  if (!raceWinner) throw new Error("Received email was not saved");
  return { email: raceWinner, isNew: false };
}

export async function notifyAdminOfReceivedEmail(email: Email): Promise<void> {
  if (!ADMIN_NOTIFICATION_EMAIL) {
    logger.warn("ADMIN_NOTIFICATION_EMAIL is not configured; skipping inbox notification");
    return;
  }

  const preview = (email.textBody ?? "").slice(0, 1000);
  const notification = await sendStoredEmail(
    {
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `[Flexi Route inbox] ${email.subject}`,
      textBody: `New email received from ${email.fromAddress}\n\nSubject: ${email.subject}\nThread: ${email.threadId}\n\n${preview}\n\nOpen inbox: ${APP_URL}/admin/inbox`,
      htmlBody: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>New email received</h2>
          <p><strong>From:</strong> ${escapeHtml(email.fromAddress)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(email.subject)}</p>
          <hr />
          <div style="white-space:pre-wrap">${escapeHtml(preview)}</div>
          <p><a href="${APP_URL}/admin/inbox">Open the Flexi Route inbox</a></p>
        </div>
      `,
      threadId: email.threadId,
      inReplyTo: email.messageId ?? undefined,
    },
    { from: NOTIFICATION_FROM, isRead: true },
  );

  logger.info({ emailId: email.id, notificationId: notification.id }, "Admin inbox notification sent");
}

export function makeWebhookHeaders(headers: Record<string, unknown>) {
  return {
    id: String(headers["svix-id"] ?? ""),
    timestamp: String(headers["svix-timestamp"] ?? ""),
    signature: String(headers["svix-signature"] ?? ""),
  };
}

export function getWebhookSecret(): string {
  return process.env.RESEND_WEBHOOK_SECRET ?? "";
}

export function isWebhookHeaderSet(headers: ReturnType<typeof makeWebhookHeaders>): boolean {
  return Boolean(headers.id && headers.timestamp && headers.signature);
}

export function isReceivedEvent(value: unknown): value is { type: "email.received"; data: { email_id: string } } {
  if (!value || typeof value !== "object") return false;
  const event = value as { type?: unknown; data?: { email_id?: unknown } };
  return event.type === "email.received" && typeof event.data?.email_id === "string";
}