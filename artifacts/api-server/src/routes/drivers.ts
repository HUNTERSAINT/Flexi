import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, driversTable, usersTable, shipmentsTable } from "@workspace/db";
import { eq, and, ilike, count, desc, SQL } from "drizzle-orm";
import { requireRole, requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/drivers
router.get("/drivers", requireRole("admin"), async (req, res) => {
  try {
    const { isAvailable, search } = req.query as Record<string, string>;

    const conditions: SQL[] = [eq(usersTable.role, "driver")];
    if (isAvailable === "true") conditions.push(eq(driversTable.isAvailable, true));
    if (isAvailable === "false") conditions.push(eq(driversTable.isAvailable, false));
    if (search) conditions.push(ilike(usersTable.name, `%${search}%`));

    const drivers = await db
      .select({
        id: driversTable.id,
        userId: driversTable.userId,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        vehicleType: driversTable.vehicleType,
        licenseNumber: driversTable.licenseNumber,
        isAvailable: driversTable.isAvailable,
        createdAt: driversTable.createdAt,
      })
      .from(driversTable)
      .innerJoin(usersTable, eq(driversTable.userId, usersTable.id))
      .where(and(...conditions))
      .orderBy(desc(driversTable.createdAt));

    // Add delivery count
    const result = await Promise.all(
      drivers.map(async (d) => {
        const [cnt] = await db.select({ count: count() }).from(shipmentsTable).where(eq(shipmentsTable.driverId, d.userId));
        return { ...d, totalDeliveries: Number(cnt?.count ?? 0) };
      })
    );

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/drivers
router.post("/drivers", requireRole("admin"), async (req, res) => {
  try {
    const { name, email, password, phone, vehicleType, licenseNumber } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email, password are required" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      name, email: email.toLowerCase(), passwordHash, phone, role: "driver",
    }).returning();
    const [driver] = await db.insert(driversTable).values({
      userId: user.id, vehicleType, licenseNumber, isAvailable: true,
    }).returning();

    res.status(201).json({
      id: driver.id,
      userId: driver.userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      vehicleType: driver.vehicleType,
      licenseNumber: driver.licenseNumber,
      isAvailable: driver.isAvailable,
      totalDeliveries: 0,
      createdAt: driver.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/drivers/:id
router.get("/drivers/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [driver] = await db
      .select({
        id: driversTable.id,
        userId: driversTable.userId,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        vehicleType: driversTable.vehicleType,
        licenseNumber: driversTable.licenseNumber,
        isAvailable: driversTable.isAvailable,
        createdAt: driversTable.createdAt,
      })
      .from(driversTable)
      .innerJoin(usersTable, eq(driversTable.userId, usersTable.id))
      .where(eq(driversTable.id, id))
      .limit(1);

    if (!driver) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }
    const [cnt] = await db.select({ count: count() }).from(shipmentsTable).where(eq(shipmentsTable.driverId, driver.userId));
    res.json({ ...driver, totalDeliveries: Number(cnt?.count ?? 0) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/drivers/:id
router.patch("/drivers/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, phone, vehicleType, licenseNumber, isAvailable } = req.body;

    const [existing] = await db.select().from(driversTable).where(eq(driversTable.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }

    if (name || phone) {
      const userUpdates: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
      if (name) userUpdates.name = name;
      if (phone) userUpdates.phone = phone;
      await db.update(usersTable).set(userUpdates).where(eq(usersTable.id, existing.userId));
    }

    const driverUpdates: Partial<typeof driversTable.$inferInsert> = { updatedAt: new Date() };
    if (vehicleType !== undefined) driverUpdates.vehicleType = vehicleType;
    if (licenseNumber !== undefined) driverUpdates.licenseNumber = licenseNumber;
    if (isAvailable !== undefined) driverUpdates.isAvailable = isAvailable;

    const [updated] = await db.update(driversTable).set(driverUpdates).where(eq(driversTable.id, id)).returning();

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);
    const [cnt] = await db.select({ count: count() }).from(shipmentsTable).where(eq(shipmentsTable.driverId, updated.userId));

    res.json({
      id: updated.id,
      userId: updated.userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      vehicleType: updated.vehicleType,
      licenseNumber: updated.licenseNumber,
      isAvailable: updated.isAvailable,
      totalDeliveries: Number(cnt?.count ?? 0),
      createdAt: updated.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/drivers/:id
router.delete("/drivers/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id)).limit(1);
    if (!driver) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }
    await db.delete(driversTable).where(eq(driversTable.id, id));
    await db.delete(usersTable).where(eq(usersTable.id, driver.userId));
    res.json({ message: "Driver deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/driver/deliveries (driver self-service)
router.get("/driver/deliveries", requireRole("driver"), async (req, res) => {
  try {
    const { status } = req.query as Record<string, string>;
    const conditions: SQL[] = [eq(shipmentsTable.driverId, req.user!.id)];
    if (status) conditions.push(eq(shipmentsTable.status, status as any));

    const shipments = await db
      .select()
      .from(shipmentsTable)
      .where(and(...conditions))
      .orderBy(desc(shipmentsTable.updatedAt));

    res.json(shipments.map((s) => ({
      id: s.id,
      trackingNumber: s.trackingNumber,
      customerId: s.customerId,
      driverId: s.driverId,
      customerName: null,
      driverName: null,
      serviceType: s.serviceType,
      status: s.status,
      originAddress: s.originAddress,
      originCity: s.originCity,
      originState: s.originState,
      originZip: s.originZip,
      destinationAddress: s.destinationAddress,
      destinationCity: s.destinationCity,
      destinationState: s.destinationState,
      destinationZip: s.destinationZip,
      weightKg: s.weightKg,
      dimensions: s.dimensions,
      description: s.description,
      estimatedDelivery: s.estimatedDelivery,
      deliveryProofUrl: s.deliveryProofUrl,
      totalAmount: s.totalAmount,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
