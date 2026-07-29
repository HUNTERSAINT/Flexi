import { Router } from "express";
import { db, pricingTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

const router = Router();

// GET /api/pricing — public
router.get("/pricing", async (_req, res) => {
  try {
    const pricing = await db.select().from(pricingTable).orderBy(pricingTable.id);
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/pricing/:id
router.patch("/pricing/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { basePriceUsd, pricePerKg, estimatedDays, description } = req.body;
    const updates: Partial<typeof pricingTable.$inferInsert> = { updatedAt: new Date() };
    if (basePriceUsd !== undefined) updates.basePriceUsd = String(basePriceUsd);
    if (pricePerKg !== undefined) updates.pricePerKg = String(pricePerKg);
    if (estimatedDays !== undefined) updates.estimatedDays = estimatedDays;
    if (description !== undefined) updates.description = description;

    const [updated] = await db.update(pricingTable).set(updates).where(eq(pricingTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Pricing config not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
