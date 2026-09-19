import { ReplitConnectors } from "@replit/connectors-sdk";
import { Resend } from "resend";
import { randomUUID } from "node:crypto";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const connectors = new ReplitConnectors();

export const DEFAULT_FROM_ADDRESS = "notifications@flexirouteglobal.com";
export const fromAddress =
  process.env.RESEND_FROM_ADDRESS || DEFAULT_FROM_ADDRESS;

type ResendError = {
  message?: string;
  name?: string;
};

type ResendResponse<T> = {
  data?: T;
  error?: ResendError;
};

export type SentEmailResult = {
  id: string;
  messageId: string;
};

export type RetrievedEmail = {
  id?: string;
  from?: string;
  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string> | Array<{ name?: string; value?: string }>;
  message_id?: string | null;
  in_reply_to?: string | null;
  thread_id?: string | null;
  attachments?: Array<{
    filename?: string;
    content_type?: string;
    contentType?: string;
    url?: string | null;
    download_url?: string | null;
    downloadUrl?: string | null;
    content_id?: string | null;
  }>;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown Resend error";
}

async function connectorRequest<T>(
  path: string,
  init: { method: string; body?: string },
): Promise<T> {
  const response = await connectors.proxy("resend", path, {
    method: init.method,
    headers: { "Content-Type": "application/json" },
    body: init.body,
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Resend request failed (${response.status}): ${responseText}`,
    );
  }

  return (await response.json()) as T;
}

function textToHtml(text: string): string {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  return escaped
    .split(/\r?\n/)
    .map((line) => `<p>${line || "&nbsp;"}</p>`)
    .join("");
}

export async function sendEmailThroughResend(input: {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}): Promise<SentEmailResult> {
  const messageId = `<${randomUUID()}@flexirouteglobal.com>`;
  const payload = {
    from: input.from || fromAddress,
    to: [input.to],
    subject: input.subject,
    text: input.body,
    html: textToHtml(input.body),
    headers: {
      "Message-ID": messageId,
      ...(input.replyTo
        ? {
            "In-Reply-To": input.replyTo.startsWith("<")
              ? input.replyTo
              : `<${input.replyTo}>`,
            References: input.replyTo.startsWith("<")
              ? input.replyTo
              : `<${input.replyTo}>`,
          }
        : {}),
    },
  };

  if (resend) {
    const result = (await resend.emails.send(payload)) as unknown as ResendResponse<{
      id: string;
    }>;
    if (result.error || !result.data?.id) {
      throw new Error(result.error?.message || "Resend did not return an email id");
    }
    return { ...result.data, messageId };
  }

  const result = await connectorRequest<SentEmailResult>("/emails", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!result.id) {
    throw new Error("Resend did not return an email id");
  }
  return { ...result, messageId };
}

export async function retrieveReceivedEmail(
  resendEmailId: string,
): Promise<RetrievedEmail> {
  if (resendApiKey) {
    const response = await fetch(
      `https://api.resend.com/emails/receiving/${encodeURIComponent(resendEmailId)}`,
      {
        headers: { Authorization: `Bearer ${resendApiKey}` },
      },
    );
    if (!response.ok) {
      throw new Error(
        `Resend retrieve failed (${response.status}): ${await response.text()}`,
      );
    }
    return (await response.json()) as RetrievedEmail;
  }

  return connectorRequest<RetrievedEmail>(
    `/emails/receiving/${encodeURIComponent(resendEmailId)}`,
    { method: "GET" },
  );
}

export function describeResendError(error: unknown): string {
  return getErrorMessage(error);
}