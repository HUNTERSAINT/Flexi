import { Router } from "express";
import { db, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

const router = Router();

// GET /api/wallets — public (used by track page currency selector)
router.get("/wallets", async (_req, res) => {
  try {
    const wallets = await db
      .select()
      .from(walletsTable)
      .orderBy(walletsTable.id);
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/wallets/:id — admin only
router.patch("/wallets/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { label, network, address, isActive } = req.body;

    const updates: Partial<typeof walletsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (label !== undefined) updates.label = label;
    if (network !== undefined) updates.network = network;
    if (address !== undefined) updates.address = address;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db
      .update(walletsTable)
      .set(updates)
      .where(eq(walletsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
