/**
 * Generates a unique tracking number for Flexi Route shipments.
 * Format: FR-YYYYMMDD-XXXXXXXX (8 random alphanumeric chars)
 */
export function generateTrackingNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let random = "";
  for (let i = 0; i < 8; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `FR-${datePart}-${random}`;
}
