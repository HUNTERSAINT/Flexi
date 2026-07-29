import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

const FROM = process.env.EMAIL_FROM ?? "Flexi Route <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL ?? "https://flexiroute.com";

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    const res = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Failed to send "${subject}" to ${to}: ${res.status} ${body}`);
    }
  } catch (err) {
    console.error("[email] Unexpected error:", err);
  }
}

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <!-- Header -->
      <tr><td style="background:#0f1f3d;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
        <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">📦 Flexi Route</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="background:#ffffff;padding:36px 40px;border-radius:0 0 12px 12px;border:1px solid #e5e9f0;border-top:none;">
        ${body}
        <hr style="border:none;border-top:1px solid #e5e9f0;margin:32px 0 20px;"/>
        <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
          This email was sent by Flexi Route. Please do not reply directly.<br/>
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
  const html = wrap("Welcome to Flexi Route", `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">Welcome aboard, ${name}! 🎉</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Your Flexi Route account is ready. You can now book shipments, track packages in real time, and manage your deliveries — all from one place.
    </p>
    ${btn("Go to Dashboard", `${APP_URL}/dashboard`)}
  `);
  await send(to, "Welcome to Flexi Route", html);
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
  const html = wrap("Shipment Confirmed", `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">Shipment Booked ✅</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${name}, your shipment has been booked successfully. Here are your details:
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
      <tbody>
        ${infoRow("Tracking Number", trackingNumber)}
        ${infoRow("From", originCity)}
        ${infoRow("To", destinationCity)}
        ${infoRow("Service", serviceType.charAt(0).toUpperCase() + serviceType.slice(1))}
        ${infoRow("Payment", receiverPays ? "Receiver pays" : "Sender pays")}
      </tbody>
    </table>
    ${btn("Track Your Shipment", `${APP_URL}/track?number=${trackingNumber}`)}
  `);
  await send(to, `Booking Confirmed — ${trackingNumber}`, html);
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
  const html = wrap("Payment Required for Your Incoming Shipment", `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">You have an incoming shipment 📦</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${recipientName || "there"}, <strong>${senderName}</strong> has sent you a package. Payment is required from you before it can be dispatched.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
      <tbody>
        ${infoRow("Tracking Number", trackingNumber)}
        ${infoRow("From", originCity)}
        ${infoRow("To", destinationCity)}
        ${infoRow("Service", serviceType.charAt(0).toUpperCase() + serviceType.slice(1))}
      </tbody>
    </table>
    ${btn("View & Pay Now", `${APP_URL}/track?number=${trackingNumber}`)}
  `);
  await send(to, `Payment Required — Shipment from ${senderName}`, html);
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
  const html = wrap(`Shipment Update: ${label}`, `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">${icon} Your shipment is ${label}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${name}, we have an update on your shipment.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
      <tbody>
        ${infoRow("Tracking Number", trackingNumber)}
        ${infoRow("Status", label)}
        ${infoRow("Route", `${originCity} → ${destinationCity}`)}
      </tbody>
    </table>
    ${btn("Track Live", `${APP_URL}/track?number=${trackingNumber}`)}
  `);
  await send(to, `Shipment Update: ${label} — ${trackingNumber}`, html);
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
  const html = wrap("Driver Assigned to Your Shipment", `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">🚛 Driver Assigned</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${name}, a driver has been assigned to your shipment and it will be picked up soon.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
      <tbody>
        ${infoRow("Tracking Number", trackingNumber)}
        ${infoRow("Driver", driverName)}
        ${infoRow("Route", `${originCity} → ${destinationCity}`)}
      </tbody>
    </table>
    ${btn("Track Your Shipment", `${APP_URL}/track?number=${trackingNumber}`)}
  `);
  await send(to, `Driver Assigned — ${trackingNumber}`, html);
}

// ── Delivery confirmation ──────────────────────────────────────────────────
export async function sendDeliveryConfirmationEmail(opts: {
  to: string;
  name: string;
  trackingNumber: string;
}): Promise<void> {
  const { to, name, trackingNumber } = opts;
  const html = wrap("Your Shipment Has Been Delivered", `
    <h2 style="margin:0 0 8px;font-size:24px;color:#0f1f3d;">🎉 Package Delivered!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${name}, your shipment <strong>${trackingNumber}</strong> has been successfully delivered. Thank you for choosing Flexi Route!
    </p>
    ${btn("View Delivery Details", `${APP_URL}/track?number=${trackingNumber}`)}
  `);
  await send(to, `Delivered — ${trackingNumber}`, html);
}
