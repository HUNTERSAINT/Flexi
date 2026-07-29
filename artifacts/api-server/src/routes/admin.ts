import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, shipmentsTable, paymentsTable } from "@workspace/db";
import { eq, count, sum, and, gte } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

const router = Router();

// GET /api/admin/analytics
router.get("/admin/analytics", requireRole("admin"), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalShipments,
      totalCustomers,
      totalDrivers,
      totalRevenue,
      shipmentsThisMonth,
      pendingPayments,
      shipmentsByStatus,
      recentShipments,
      paymentStats,
    ] = await Promise.all([
      db.select({ count: count() }).from(shipmentsTable),
      db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "customer")),
      db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "driver")),
      db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable).where(eq(paymentsTable.status, "confirmed")),
      db.select({ count: count() }).from(shipmentsTable).where(gte(shipmentsTable.createdAt, startOfMonth)),
      db.select({ count: count() }).from(paymentsTable).where(eq(paymentsTable.status, "awaiting_payment")),
      db.execute<{ status: string; count: number }>(
        `SELECT status, COUNT(*)::int as count FROM shipments GROUP BY status ORDER BY count DESC`
      ),
      db.select({
        id: shipmentsTable.id,
        trackingNumber: shipmentsTable.trackingNumber,
        status: shipmentsTable.status,
        originCity: shipmentsTable.originCity,
        destinationCity: shipmentsTable.destinationCity,
        createdAt: shipmentsTable.createdAt,
      }).from(shipmentsTable).orderBy(shipmentsTable.createdAt).limit(5),
      db.execute<{ status: string; count: number }>(
        `SELECT status, COUNT(*)::int as count FROM payments GROUP BY status`
      ),
    ]);

    const paymentStatsMap: Record<string, number> = {};
    for (const row of paymentStats.rows) {
      paymentStatsMap[row.status] = row.count;
    }

    res.json({
      totalShipments: Number(totalShipments[0]?.count ?? 0),
      totalCustomers: Number(totalCustomers[0]?.count ?? 0),
      totalDrivers: Number(totalDrivers[0]?.count ?? 0),
      totalRevenue: Number(totalRevenue[0]?.total ?? 0),
      shipmentsThisMonth: Number(shipmentsThisMonth[0]?.count ?? 0),
      pendingPayments: Number(pendingPayments[0]?.count ?? 0),
      shipmentsByStatus: shipmentsByStatus.rows,
      recentShipments,
      paymentStats: {
        awaitingPayment: paymentStatsMap["awaiting_payment"] ?? 0,
        underReview: paymentStatsMap["under_review"] ?? 0,
        confirmed: paymentStatsMap["confirmed"] ?? 0,
        rejected: paymentStatsMap["rejected"] ?? 0,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/admins — list all admin users
router.get("/admin/admins", requireRole("admin"), async (req, res) => {
  try {
    const admins = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"))
      .orderBy(usersTable.createdAt);
    res.json(admins);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/admins — create a new admin user
router.post("/admin/admins", requireRole("admin"), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email, and password are required" });
      return;
    }
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "An account with this email already exists" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || null,
      role: "admin",
      isActive: true,
    }).returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    });
    res.status(201).json(user);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/admins/:id — remove an admin user
router.delete("/admin/admins/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user!.id) {
      res.status(400).json({ error: "You cannot remove your own admin account" });
      return;
    }
    const [target] = await db.select({ id: usersTable.id, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (target.role !== "admin") {
      res.status(400).json({ error: "User is not an admin" });
      return;
    }
    // Downgrade to customer rather than hard delete to preserve shipment history
    await db.update(usersTable).set({ role: "customer", isActive: false }).where(eq(usersTable.id, id));
    res.json({ message: "Admin access removed" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
