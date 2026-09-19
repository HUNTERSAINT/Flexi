import { db, notificationsTable } from "@workspace/db";

type NotificationType = "shipment_update" | "payment_update" | "system" | "driver_assignment";

export async function createNotification(
  userId: number,
  title: string,
  message: string,
  type: NotificationType = "system",
  relatedId?: number
): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      userId,
      title,
      message,
      type,
      relatedId,
      isRead: false,
    });
  } catch (err) {
    // Non-fatal – log and continue
    console.error("Failed to create notification:", err);
  }
}
