const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.EMAIL_FROM ?? "Flexi Route <support@flexirouteglobal.com>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? FROM;
const APP_URL = process.env.APP_URL ?? "https://flexirouteglobal.com";

export interface EmailResult {
  ok: boolean;
  error?: string;
}

async function send(to: string, subject: string, html: string, text: string): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY is not set — skipping email send");
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to,
        reply_to: REPLY_TO,
        subject,
        html,
        text,
        headers: {
          "X-Entity-Ref-ID": `flexi-route-${Date.now()}`,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      const error = `HTTP ${res.status}: ${body}`;
      console.error(`[email] Failed to send "${subject}" to ${to}: ${error}`);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[email] Unexpected error:", err);
    return { ok: false, error };
  }
}

function wrap(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
<!--[if !mso]><!-->
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>
<!--<![endif]-->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f6fb;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">
      <!-- Header -->
      <tr><td style="background:#0f1f3d;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
        <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">📦 Flexi Route</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="background:#ffffff;padding:36px 40px;border-radius:0 0 12px 12px;border:1px solid #e5e9f0;border-top:none;">
        ${body}
        <hr style="border:none;border-top:1px solid #e5e9f0;margin:32px 0 20px;"/>
        <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
          Questions? Reply to this email or contact us at <a href="mailto:${REPLY_TO}" style="color:#94a3b8;">${REPLY_TO}</a><br/>
          &copy; ${new Date().getFullYear()} Flexi Route. All rights reserved.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function btn(label: string, url: string): string {
  return `<p style="text-align:center;margin:28px 0 0;">
    <a href="${url}" style="display:inline-block;background:#f97316;color:#fff;font-weight:600;font-size:15px;padding:13px 32px;border-radius:8px;text-decoration:none;">${label}</a>
  </p>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#64748b;width:160px;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:#1e293b;font-weight:600;">${value}</td>
  </tr>`;
}

// ── Welcome email ──────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const html = wrap("Welcome to Flexi Route", `Welcome to Flexi Route, ${name}! Your account is ready.`, `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">Welcome aboard, ${name}! 🎉</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Your Flexi Route account is ready. You can now book shipments, track packages in real time, and manage your deliveries — all from one place.
    </p>
    ${btn("Go to Dashboard", `${APP_URL}/dashboard`)}
  `);
  const text = `Welcome to Flexi Route, ${name}!\n\nYour account is ready. Book shipments, track packages, and manage deliveries at ${APP_URL}/dashboard\n\n© ${new Date().getFullYear()} Flexi Route`;
  await send(to, `Welcome to Flexi Route, ${name}!`, html, text);
}

// ── Booking confirmation ───────────────────────────────────────────────────
export async function sendBookingConfirmation(opts: {
  to: string;
  name: string;
  trackingNumber: string;
  originCity: string;
  destinationCity: string;
  serviceType: string;
  receiverPays: boolean;
}): Promise<void> {
  const { to, name, trackingNumber, originCity, destinationCity, serviceType, receiverPays } = opts;
  const trackUrl = `${APP_URL}/track?number=${trackingNumber}`;
  const html = wrap(
    `Booking Confirmed — ${trackingNumber}`,
    `Your shipment ${trackingNumber} from ${originCity} to ${destinationCity} has been booked.`,
    `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">Shipment Booked ✅</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${name}, your shipment has been booked successfully. Here are your details:
    </p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
      <tbody>
        ${infoRow("Tracking Number", trackingNumber)}
        ${infoRow("From", originCity)}
        ${infoRow("To", destinationCity)}
        ${infoRow("Service", serviceType.charAt(0).toUpperCase() + serviceType.slice(1))}
        ${infoRow("Payment", receiverPays ? "Receiver pays" : "Sender pays")}
      </tbody>
    </table>
    ${btn("Track Your Shipment", trackUrl)}
  `);
  const text = `Hi ${name},\n\nYour shipment has been booked!\n\nTracking Number: ${trackingNumber}\nFrom: ${originCity}\nTo: ${destinationCity}\nService: ${serviceType}\nPayment: ${receiverPays ? "Receiver pays" : "Sender pays"}\n\nTrack your shipment: ${trackUrl}\n\n© ${new Date().getFullYear()} Flexi Route`;
  await send(to, `Booking Confirmed — ${trackingNumber}`, html, text);
}

// ── Receiver-pays notification ─────────────────────────────────────────────
export async function sendReceiverPaysNotification(opts: {
  to: string;
  recipientName: string;
  senderName: string;
  trackingNumber: string;
  originCity: string;
  destinationCity: string;
  serviceType: string;
}): Promise<void> {
  const { to, recipientName, senderName, trackingNumber, originCity, destinationCity, serviceType } = opts;
  const payUrl = `${APP_URL}/track?number=${trackingNumber}`;
  const html = wrap(
    `Action Required: Incoming Shipment from ${senderName}`,
    `${senderName} sent you a package. Complete payment to receive it.`,
    `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">You have an incoming shipment 📦</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${recipientName || "there"}, <strong>${senderName}</strong> has sent you a package. A one-time payment is required from you before it can be dispatched.
    </p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
      <tbody>
        ${infoRow("Tracking Number", trackingNumber)}
        ${infoRow("From", originCity)}
        ${infoRow("To", destinationCity)}
        ${infoRow("Service", serviceType.charAt(0).toUpperCase() + serviceType.slice(1))}
        ${infoRow("Sent by", senderName)}
      </tbody>
    </table>
    ${btn("View & Pay Now", payUrl)}
    <p style="margin:16px 0 0;font-size:13px;color:#64748b;text-align:center;">
      You can also copy and paste this link: <a href="${payUrl}" style="color:#f97316;">${payUrl}</a>
    </p>
  `);
  const text = `Hi ${recipientName || "there"},\n\n${senderName} has sent you a package via Flexi Route. Payment is required before it can be dispatched.\n\nTracking Number: ${trackingNumber}\nFrom: ${originCity}\nTo: ${destinationCity}\nService: ${serviceType}\n\nClick to view and pay: ${payUrl}\n\n© ${new Date().getFullYear()} Flexi Route`;
  await send(to, `Action Required: Incoming Shipment from ${senderName}`, html, text);
}

// ── Status update ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_ICONS: Record<string, string> = {
  confirmed: "✅",
  processing: "🔄",
  in_transit: "🚛",
  out_for_delivery: "🏃",
  delivered: "🎉",
  cancelled: "❌",
};

export async function sendStatusUpdateEmail(opts: {
  to: string;
  name: string;
  trackingNumber: string;
  status: string;
  originCity: string;
  destinationCity: string;
}): Promise<void> {
  const { to, name, trackingNumber, status, originCity, destinationCity } = opts;
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  const icon = STATUS_ICONS[status] ?? "📦";
  const trackUrl = `${APP_URL}/track?number=${trackingNumber}`;
  const html = wrap(
    `Shipment Update: ${label}`,
    `Your shipment ${trackingNumber} is now ${label}.`,
    `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">${icon} Your shipment is ${label}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${name}, we have an update on your shipment.
    </p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
      <tbody>
        ${infoRow("Tracking Number", trackingNumber)}
        ${infoRow("Status", label)}
        ${infoRow("Route", `${originCity} → ${destinationCity}`)}
      </tbody>
    </table>
    ${btn("Track Live", trackUrl)}
  `);
  const text = `Hi ${name},\n\nYour shipment ${trackingNumber} is now: ${label}\nRoute: ${originCity} → ${destinationCity}\n\nTrack live: ${trackUrl}\n\n© ${new Date().getFullYear()} Flexi Route`;
  await send(to, `Shipment Update: ${label} — ${trackingNumber}`, html, text);
}

// ── Driver assigned ────────────────────────────────────────────────────────
export async function sendDriverAssignedEmail(opts: {
  to: string;
  name: string;
  trackingNumber: string;
  driverName: string;
  originCity: string;
  destinationCity: string;
}): Promise<void> {
  const { to, name, trackingNumber, driverName, originCity, destinationCity } = opts;
  const trackUrl = `${APP_URL}/track?number=${trackingNumber}`;
  const html = wrap(
    `Driver Assigned — ${trackingNumber}`,
    `A driver has been assigned to your shipment ${trackingNumber}.`,
    `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">🚛 Driver Assigned</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${name}, a driver has been assigned to your shipment and it will be picked up soon.
    </p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
      <tbody>
        ${infoRow("Tracking Number", trackingNumber)}
        ${infoRow("Driver", driverName)}
        ${infoRow("Route", `${originCity} → ${destinationCity}`)}
      </tbody>
    </table>
    ${btn("Track Your Shipment", trackUrl)}
  `);
  const text = `Hi ${name},\n\nA driver has been assigned to your shipment ${trackingNumber}.\nDriver: ${driverName}\nRoute: ${originCity} → ${destinationCity}\n\nTrack: ${trackUrl}\n\n© ${new Date().getFullYear()} Flexi Route`;
  await send(to, `Driver Assigned — ${trackingNumber}`, html, text);
}

// ── Receiver payment confirmed ─────────────────────────────────────────────
export async function sendReceiverPaymentConfirmedEmail(opts: {
  to: string;
  recipientName: string;
  trackingNumber: string;
  originCity: string;
  destinationCity: string;
  serviceType: string;
  currency: string;
}): Promise<EmailResult> {
  const { to, recipientName, trackingNumber, originCity, destinationCity, serviceType, currency } = opts;
  const trackUrl = `${APP_URL}/track?number=${trackingNumber}`;
  const html = wrap(
    `Payment Confirmed — ${trackingNumber}`,
    `Your payment for shipment ${trackingNumber} has been confirmed. Your package is on its way!`,
    `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">✅ Payment Confirmed</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${recipientName || "there"}, your ${currency.replace(/_/g, " ")} payment has been confirmed and your shipment is now being processed. We'll keep you updated as it moves towards you.
    </p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
      <tbody>
        ${infoRow("Tracking Number", trackingNumber)}
        ${infoRow("From", originCity)}
        ${infoRow("To", destinationCity)}
        ${infoRow("Service", serviceType.charAt(0).toUpperCase() + serviceType.slice(1))}
        ${infoRow("Payment", `${currency.replace(/_/g, " ")} — Confirmed`)}
        ${infoRow("Status", "Processing")}
      </tbody>
    </table>
    ${btn("Track Your Shipment", trackUrl)}
    <p style="margin:16px 0 0;font-size:13px;color:#64748b;text-align:center;">
      You can also copy and paste this link: <a href="${trackUrl}" style="color:#f97316;">${trackUrl}</a>
    </p>
  `);
  const text = `Hi ${recipientName || "there"},\n\nYour ${currency.replace(/_/g, " ")} payment for shipment ${trackingNumber} has been confirmed and the shipment is now being processed.\n\nTracking Number: ${trackingNumber}\nFrom: ${originCity}\nTo: ${destinationCity}\nService: ${serviceType}\nStatus: Processing\n\nTrack your shipment: ${trackUrl}\n\n© ${new Date().getFullYear()} Flexi Route`;
  return send(to, `Payment Confirmed — ${trackingNumber}`, html, text);
}

// ── Delivery confirmation ──────────────────────────────────────────────────
export async function sendDeliveryConfirmationEmail(opts: {
  to: string;
  name: string;
  trackingNumber: string;
}): Promise<void> {
  const { to, name, trackingNumber } = opts;
  const trackUrl = `${APP_URL}/track?number=${trackingNumber}`;
  const html = wrap(
    `Delivered — ${trackingNumber}`,
    `Your package ${trackingNumber} has been successfully delivered!`,
    `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">🎉 Package Delivered!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${name}, your shipment <strong>${trackingNumber}</strong> has been successfully delivered. Thank you for choosing Flexi Route!
    </p>
    ${btn("View Delivery Details", trackUrl)}
  `);
  const text = `Hi ${name},\n\nYour shipment ${trackingNumber} has been successfully delivered!\n\nView details: ${trackUrl}\n\nThank you for choosing Flexi Route!\n\n© ${new Date().getFullYear()} Flexi Route`;
  await send(to, `Delivered — ${trackingNumber}`, html, text);
}
