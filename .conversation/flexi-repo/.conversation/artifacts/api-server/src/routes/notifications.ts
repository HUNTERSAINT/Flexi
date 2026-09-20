import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/notifications
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const { isRead } = req.query;
    const conditions = [eq(notificationsTable.userId, req.user!.id)];
    if (isRead === "true") conditions.push(eq(notificationsTable.isRead, true));
    if (isRead === "false") conditions.push(eq(notificationsTable.isRead, false));

    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(and(...conditions))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    res.json(notifications);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/notifications/read-all
router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, req.user!.id));
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [notification] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.user!.id)))
      .returning();
    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json(notification);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
