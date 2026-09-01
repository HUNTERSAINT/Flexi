import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import bcrypt from "bcryptjs";
import { db, pricingTable, shipmentsTable, trackingEventsTable, paymentsTable, usersTable } from "@workspace/db";
import { eq, and, ilike, or, count, desc, SQL } from "drizzle-orm";
import { requireAuth, requireRole, signToken } from "../middlewares/auth";
import { generateTrackingNumber } from "../lib/trackingNumber";
import { createNotification } from "../lib/notifications";
import { getWalletAddresses } from "../lib/wallets";
import {
  sendBookingConfirmation,
  sendReceiverPaysNotification,
  sendStatusUpdateEmail,
  sendDriverAssignedEmail,
  sendDeliveryConfirmationEmail,
} from "../lib/email";

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `delivery-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const SERVICE_TYPES = ["standard", "express", "overnight", "freight"] as const;
const PAYMENT_CURRENCIES = ["BTC", "ETH", "USDT_TRC20", "USDT_ERC20", "USDC", "LTC", "XRP"] as const;

function serializeShipment(s: any) {
  return {
    id: s.id,
    trackingNumber: s.trackingNumber,
    customerId: s.customerId,
    driverId: s.driverId,
    customerName: (s as any).customerName ?? null,
    driverName: (s as any).driverName ?? null,
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
    senderName: s.senderName,
    senderPhone: s.senderPhone,
    recipientName: s.recipientName,
    recipientPhone: s.recipientPhone,
    recipientEmail: s.recipientEmail,
    receiverPays: s.receiverPays,
    estimatedDelivery: s.estimatedDelivery,
    deliveryProofUrl: s.deliveryProofUrl,
    totalAmount: s.totalAmount,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

async function generateUniqueTrackingNumber(): Promise<string> {
  let trackingNumber: string = "";
  let attempts = 0;
  do {
    trackingNumber = generateTrackingNumber();
    attempts++;
    if (attempts > 10) break;
    const existing = await db.select({ id: shipmentsTable.id }).from(shipmentsTable).where(eq(shipmentsTable.trackingNumber, trackingNumber)).limit(1);
    if (existing.length === 0) break;
  } while (true);
  return trackingNumber;
}

// POST /api/shipments/guest — No auth required, creates account automatically
router.post("/shipments/guest", async (req, res) => {
  try {
    const {
      guestName, guestEmail, guestPhone,
      serviceType, originAddress, originCity, originState, originZip,
      destinationAddress, destinationCity, destinationState, destinationZip,
      weightKg, dimensions, description,
      recipientName, recipientPhone, recipientEmail,
      receiverPays, currency,
    } = req.body;

    if (!guestName || !guestEmail || !guestPhone || !originAddress || !destinationAddress || !weightKg) {
      res.status(400).json({ error: "Missing required fields: name, email, phone, origin address, destination address, and weight" });
      return;
    }
    const numericWeight = Number(weightKg);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      res.status(400).json({ error: "Weight must be greater than 0" });
      return;
    }
    if (!SERVICE_TYPES.includes(serviceType as (typeof SERVICE_TYPES)[number])) {
      res.status(400).json({ error: "Please select a valid service type" });
      return;
    }
    if (typeof receiverPays !== "boolean") {
      res.status(400).json({ error: "Please choose who will pay for this shipment" });
      return;
    }
    if (!receiverPays && !PAYMENT_CURRENCIES.includes(currency as (typeof PAYMENT_CURRENCIES)[number])) {
      res.status(400).json({ error: "Please select a valid payment currency" });
      return;
    }

    const [pricing] = await db
      .select({ basePriceUsd: pricingTable.basePriceUsd, pricePerKg: pricingTable.pricePerKg })
      .from(pricingTable)
      .where(eq(pricingTable.serviceType, serviceType))
      .limit(1);
    if (!pricing) {
      res.status(503).json({ error: "Service pricing is not configured yet. Please try again shortly." });
      return;
    }
    const totalAmount = (Number(pricing.basePriceUsd) + numericWeight * Number(pricing.pricePerKg)).toFixed(2);
    const wallets = !receiverPays ? await getWalletAddresses() : null;
    if (!receiverPays && !wallets?.[currency]) {
      res.status(503).json({ error: "The selected payment currency is not configured yet. Please choose another currency." });
      return;
    }

    // Find or create user account
    let customerId: number;
    let token: string;

    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, guestEmail.toLowerCase())).limit(1);

    if (existingUser) {
      customerId = existingUser.id;
      token = signToken({ id: existingUser.id, email: existingUser.email, role: existingUser.role, name: existingUser.name });
    } else {
      // Auto-create a customer account
      const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      const [newUser] = await db.insert(usersTable).values({
        name: guestName,
        email: guestEmail.toLowerCase(),
        passwordHash,
        phone: guestPhone || null,
        role: "customer",
      }).returning();
      customerId = newUser.id;
      token = signToken({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name });
    }

    const trackingNumber = await generateUniqueTrackingNumber();
    const [shipment] = await db.insert(shipmentsTable).values({
      trackingNumber,
      customerId,
      serviceType: serviceType || "standard",
      status: "pending",
      originAddress, originCity, originState, originZip,
      destinationAddress, destinationCity, destinationState, destinationZip,
      weightKg: String(numericWeight),
      dimensions, description,
      senderName: guestName,
      senderPhone: guestPhone || null,
      recipientName: recipientName || null,
      recipientPhone: recipientPhone || null,
      recipientEmail: recipientEmail || null,
      receiverPays: !!receiverPays,
      totalAmount,
    }).returning();

    // Create initial tracking event
    await db.insert(trackingEventsTable).values({
      shipmentId: shipment.id,
      status: "pending",
      description: "Shipment booked and awaiting processing",
      location: originCity,
    });

    await createNotification(customerId, "Shipment Booked", `Your shipment ${trackingNumber} has been booked successfully.`, "shipment_update", shipment.id);

    // Booking confirmation to sender
    sendBookingConfirmation({
      to: guestEmail,
      name: guestName,
      trackingNumber,
      originCity: originCity ?? "",
      destinationCity: destinationCity ?? "",
      serviceType: serviceType || "standard",
      receiverPays: !!receiverPays,
    }).catch(() => {});

    // Notify recipient if they are paying
    if (receiverPays && recipientEmail) {
      sendReceiverPaysNotification({
        to: recipientEmail,
        recipientName: recipientName ?? "",
        senderName: guestName,
        trackingNumber,
        originCity: originCity ?? "",
        destinationCity: destinationCity ?? "",
        serviceType: serviceType || "standard",
      }).catch(() => {});
    }

    let paymentId: number | null = null;

    if (!receiverPays && currency) {
      // Create payment record for sender
      const walletAddress = wallets?.[currency];
      if (walletAddress) {
        const [payment] = await db.insert(paymentsTable).values({
          shipmentId: shipment.id,
          amount: totalAmount,
          currency,
          walletAddress,
          status: "awaiting_payment",
        }).returning();
        paymentId = payment.id;
      }
    }

    res.status(201).json({
      trackingNumber: shipment.trackingNumber,
      shipmentId: shipment.id,
      paymentId,
      token,
      receiverPays: !!receiverPays,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/shipments
router.get("/shipments", requireAuth, async (req, res) => {
  try {
    const { status, search, page = "1", limit = "20", customerId, driverId } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (req.user!.role === "customer") conditions.push(eq(shipmentsTable.customerId, req.user!.id));
    if (req.user!.role === "driver") conditions.push(eq(shipmentsTable.driverId, req.user!.id));
    if (req.user!.role === "admin" && customerId) conditions.push(eq(shipmentsTable.customerId, parseInt(customerId)));
    if (req.user!.role === "admin" && driverId) conditions.push(eq(shipmentsTable.driverId, parseInt(driverId)));
    if (status) conditions.push(eq(shipmentsTable.status, status as any));
    if (search) conditions.push(
      or(
        ilike(shipmentsTable.trackingNumber, `%${search}%`),
        ilike(shipmentsTable.originCity, `%${search}%`),
        ilike(shipmentsTable.destinationCity, `%${search}%`),
      )!
    );

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const customerAlias = { customerName: usersTable.name };
    const [totalResult, shipments] = await Promise.all([
      db.select({ count: count() }).from(shipmentsTable).where(whereClause),
      db
        .select({
          id: shipmentsTable.id,
          trackingNumber: shipmentsTable.trackingNumber,
          customerId: shipmentsTable.customerId,
          driverId: shipmentsTable.driverId,
          serviceType: shipmentsTable.serviceType,
          status: shipmentsTable.status,
          originAddress: shipmentsTable.originAddress,
          originCity: shipmentsTable.originCity,
          originState: shipmentsTable.originState,
          originZip: shipmentsTable.originZip,
          destinationAddress: shipmentsTable.destinationAddress,
          destinationCity: shipmentsTable.destinationCity,
          destinationState: shipmentsTable.destinationState,
          destinationZip: shipmentsTable.destinationZip,
          weightKg: shipmentsTable.weightKg,
          dimensions: shipmentsTable.dimensions,
          description: shipmentsTable.description,
          senderName: shipmentsTable.senderName,
          senderPhone: shipmentsTable.senderPhone,
          recipientName: shipmentsTable.recipientName,
          recipientPhone: shipmentsTable.recipientPhone,
          recipientEmail: shipmentsTable.recipientEmail,
          receiverPays: shipmentsTable.receiverPays,
          estimatedDelivery: shipmentsTable.estimatedDelivery,
          deliveryProofUrl: shipmentsTable.deliveryProofUrl,
          totalAmount: shipmentsTable.totalAmount,
          createdAt: shipmentsTable.createdAt,
          updatedAt: shipmentsTable.updatedAt,
          customerName: usersTable.name,
        })
        .from(shipmentsTable)
        .leftJoin(usersTable, eq(shipmentsTable.customerId, usersTable.id))
        .where(whereClause)
        .orderBy(desc(shipmentsTable.createdAt))
        .limit(limitNum)
        .offset(offset),
    ]);

    // Attach driver names in a second pass (separate join to avoid cartesian issues)
    const driverIds = [...new Set(shipments.map(s => s.driverId).filter(Boolean))] as number[];
    const driverNames: Record<number, string> = {};
    if (driverIds.length > 0) {
      const driverUsers = await db
        .select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.role, "driver"));
      driverUsers.forEach(d => { driverNames[d.id] = d.name; });
    }

    res.json({
      data: shipments.map(s => serializeShipment({ ...s, driverName: s.driverId ? (driverNames[s.driverId] ?? null) : null })),
      total: Number(totalResult[0]?.count ?? 0),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/shipments (authenticated)
router.post("/shipments", requireRole("customer", "admin"), async (req, res) => {
  try {
    const {
      serviceType, originAddress, originCity, originState, originZip,
      destinationAddress, destinationCity, destinationState, destinationZip,
      weightKg, dimensions, description,
      senderName, senderPhone, recipientName, recipientPhone, recipientEmail,
      receiverPays,
    } = req.body;

    if (!originAddress || !destinationAddress || !weightKg) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const numericWeight = Number(weightKg);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      res.status(400).json({ error: "Weight must be greater than 0" });
      return;
    }
    const normalizedServiceType = serviceType || "standard";
    if (!SERVICE_TYPES.includes(normalizedServiceType as (typeof SERVICE_TYPES)[number])) {
      res.status(400).json({ error: "Please select a valid service type" });
      return;
    }
    const [pricing] = await db
      .select({ basePriceUsd: pricingTable.basePriceUsd, pricePerKg: pricingTable.pricePerKg })
      .from(pricingTable)
      .where(eq(pricingTable.serviceType, normalizedServiceType))
      .limit(1);
    if (!pricing) {
      res.status(503).json({ error: "Service pricing is not configured yet. Please try again shortly." });
      return;
    }
    const totalAmount = (Number(pricing.basePriceUsd) + numericWeight * Number(pricing.pricePerKg)).toFixed(2);

    const trackingNumber = await generateUniqueTrackingNumber();
    const customerId = req.user!.role === "admin" ? (req.body.customerId || req.user!.id) : req.user!.id;

    const [shipment] = await db.insert(shipmentsTable).values({
      trackingNumber,
      customerId,
      serviceType: normalizedServiceType,
      status: "pending",
      originAddress, originCity, originState, originZip,
      destinationAddress, destinationCity, destinationState, destinationZip,
      weightKg: String(numericWeight),
      dimensions, description,
      senderName, senderPhone,
      recipientName, recipientPhone,
      recipientEmail: recipientEmail || null,
      receiverPays: !!receiverPays,
      totalAmount,
    }).returning();

    await db.insert(trackingEventsTable).values({
      shipmentId: shipment.id,
      status: "pending",
      description: "Shipment booked and awaiting processing",
      location: originCity,
    });

    await createNotification(customerId, "Shipment Booked", `Your shipment ${trackingNumber} has been booked successfully.`, "shipment_update", shipment.id);

    // Booking confirmation email to the authenticated user
    sendBookingConfirmation({
      to: req.user!.email,
      name: req.user!.name,
      trackingNumber,
      originCity: originCity ?? "",
      destinationCity: destinationCity ?? "",
      serviceType: serviceType || "standard",
      receiverPays: !!receiverPays,
    }).catch(() => {});

    // Notify recipient if they are paying
    if (receiverPays && recipientEmail) {
      sendReceiverPaysNotification({
        to: recipientEmail,
        recipientName: recipientName ?? "",
        senderName: req.user!.name,
        trackingNumber,
        originCity: originCity ?? "",
        destinationCity: destinationCity ?? "",
        serviceType: serviceType || "standard",
      }).catch(() => {});
    }

    res.status(201).json(serializeShipment(shipment));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/shipments/:id
router.get("/shipments/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
    if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
    if (req.user!.role === "customer" && shipment.customerId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }
    if (req.user!.role === "driver" && shipment.driverId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const [events, payment] = await Promise.all([
      db.select().from(trackingEventsTable).where(eq(trackingEventsTable.shipmentId, id)).orderBy(trackingEventsTable.createdAt),
      db.select().from(paymentsTable).where(eq(paymentsTable.shipmentId, id)).limit(1),
    ]);

    res.json({ ...serializeShipment(shipment), events, payment: payment[0] ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/shipments/:id
router.patch("/shipments/:id", requireRole("admin", "driver"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { status, driverId, estimatedDelivery, totalAmount } = req.body;
    const [existing] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Shipment not found" }); return; }
    if (req.user!.role === "driver" && existing.driverId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const updates: Partial<typeof shipmentsTable.$inferInsert> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (driverId !== undefined) updates.driverId = driverId;
    if (estimatedDelivery) updates.estimatedDelivery = estimatedDelivery;
    if (totalAmount !== undefined) updates.totalAmount = String(totalAmount);

    const [updated] = await db.update(shipmentsTable).set(updates).where(eq(shipmentsTable.id, id)).returning();
    if (status && status !== existing.status) {
      await db.insert(trackingEventsTable).values({
        shipmentId: id,
        status,
        description: "Shipment status updated to " + status.replace(/_/g, " ")
      });
      await createNotification(existing.customerId, "Shipment Status Updated", `Your shipment ${existing.trackingNumber} status changed to ${status.replace(/_/g, " ")}.`, "shipment_update", id);
      // Send status update email to sender (customer)
      const [customer] = await db.select({ email: usersTable.email, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, existing.customerId)).limit(1);
      if (customer) {
        sendStatusUpdateEmail({
          to: customer.email,
          name: customer.name,
          trackingNumber: existing.trackingNumber,
          status,
          originCity: existing.originCity ?? "",
          destinationCity: existing.destinationCity ?? "",
        }).catch(() => {});
      }
      // Send status update email to recipient (receiver) if email is on file
      if (existing.recipientEmail) {
        sendStatusUpdateEmail({
          to: existing.recipientEmail,
          name: existing.recipientName ?? "there",
          trackingNumber: existing.trackingNumber,
          status,
          originCity: existing.originCity ?? "",
          destinationCity: existing.destinationCity ?? "",
        }).catch(() => {});
      }
    }
    res.json(serializeShipment(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/shipments/:id
router.delete("/shipments/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [deleted] = await db.delete(shipmentsTable).where(eq(shipmentsTable.id, id)).returning({ id: shipmentsTable.id });
    if (!deleted) { res.status(404).json({ error: "Shipment not found" }); return; }
    res.json({ message: "Shipment deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/shipments/:id/assign
router.post("/shipments/:id/assign", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { driverId } = req.body;
    if (!driverId) { res.status(400).json({ error: "driverId is required" }); return; }
    const [updated] = await db.update(shipmentsTable).set({ driverId, status: "confirmed", updatedAt: new Date() }).where(eq(shipmentsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Shipment not found" }); return; }
    await createNotification(updated.customerId, "Driver Assigned", `A driver has been assigned to your shipment ${updated.trackingNumber}.`, "driver_assignment", id);

    // Send driver-assigned email
    const [customer, driver] = await Promise.all([
      db.select({ email: usersTable.email, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.customerId)).limit(1),
      driverId ? db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, parseInt(String(driverId)))).limit(1) : Promise.resolve([]),
    ]);
    if (customer[0]) {
      sendDriverAssignedEmail({
        to: customer[0].email,
        name: customer[0].name,
        trackingNumber: updated.trackingNumber,
        driverName: driver[0]?.name ?? "your driver",
        originCity: updated.originCity ?? "",
        destinationCity: updated.destinationCity ?? "",
      }).catch(() => {});
    }
    res.json(serializeShipment(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/shipments/:id/events
router.get("/shipments/:id/events", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const events = await db.select().from(trackingEventsTable).where(eq(trackingEventsTable.shipmentId, id)).orderBy(trackingEventsTable.createdAt);
    res.json(events);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/shipments/:id/events
router.post("/shipments/:id/events", requireRole("admin", "driver"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { status, location, description } = req.body;
    if (!status || !description) { res.status(400).json({ error: "status and description are required" }); return; }
    const [event] = await db.insert(trackingEventsTable).values({ shipmentId: id, status, location, description }).returning();
    const [shipment] = await db.update(shipmentsTable).set({ status, updatedAt: new Date() }).where(eq(shipmentsTable.id, id)).returning();
    if (shipment) await createNotification(shipment.customerId, "Shipment Update", description, "shipment_update", id);
    res.status(201).json(event);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/shipments/:id/proof
router.post("/shipments/:id/proof", requireRole("driver", "admin"), upload.single("file"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const proofUrl = `/api/uploads/${req.file.filename}`;
    const [updated] = await db.update(shipmentsTable).set({ deliveryProofUrl: proofUrl, status: "delivered", updatedAt: new Date() }).where(eq(shipmentsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Shipment not found" }); return; }
    await db.insert(trackingEventsTable).values({ shipmentId: id, status: "delivered", description: "Package delivered. Proof of delivery uploaded.", location: req.body.notes || undefined });
    await createNotification(updated.customerId, "Shipment Delivered", `Your shipment ${updated.trackingNumber} has been delivered.`, "shipment_update", id);

    // Send delivery confirmation email
    const [deliveryCustomer] = await db.select({ email: usersTable.email, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.customerId)).limit(1);
    if (deliveryCustomer) {
      sendDeliveryConfirmationEmail({
        to: deliveryCustomer.email,
        name: deliveryCustomer.name,
        trackingNumber: updated.trackingNumber,
      }).catch(() => {});
    }
    res.json(serializeShipment(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
