import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { db, paymentsTable, shipmentsTable } from "@workspace/db";
import { eq, and, inArray, count, desc, SQL } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { getWalletAddresses } from "../lib/wallets";
import { createNotification } from "../lib/notifications";
import { sendReceiverPaymentConfirmedEmail } from "../lib/email";

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const proofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `payment-proof-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage: proofStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/payments
router.get("/payments", requireAuth, async (req, res) => {
  try {
    const { status, shipmentId, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (status) conditions.push(eq(paymentsTable.status, status as any));
    if (shipmentId) conditions.push(eq(paymentsTable.shipmentId, parseInt(shipmentId)));

    // Customers only see their own payments
    if (req.user!.role === "customer") {
      const myShipments = await db
        .select({ id: shipmentsTable.id })
        .from(shipmentsTable)
        .where(eq(shipmentsTable.customerId, req.user!.id));
      if (myShipments.length === 0) {
        res.json({ data: [], total: 0, page: pageNum, limit: limitNum });
        return;
      }
      const shipmentIds = myShipments.map((s) => s.id);
      conditions.push(inArray(paymentsTable.shipmentId, shipmentIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, payments] = await Promise.all([
      db.select({ count: count() }).from(paymentsTable).where(whereClause),
      db
        .select()
        .from(paymentsTable)
        .where(whereClause)
        .orderBy(desc(paymentsTable.createdAt))
        .limit(limitNum)
        .offset(offset),
    ]);

    res.json({
      data: payments,
      total: Number(totalResult[0]?.count ?? 0),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/payments
router.post("/payments", requireAuth, async (req, res) => {
  try {
    const { shipmentId, amount, currency } = req.body;
    if (!shipmentId || !amount || !currency) {
      res.status(400).json({ error: "shipmentId, amount, and currency are required" });
      return;
    }
    const wallets = await getWalletAddresses();
    const walletAddress = wallets[currency as string];
    if (!walletAddress) {
      res.status(400).json({ error: "Unsupported currency" });
      return;
    }
    // Verify shipment exists
    const [shipment] = await db
      .select()
      .from(shipmentsTable)
      .where(eq(shipmentsTable.id, parseInt(shipmentId)))
      .limit(1);
    if (!shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }
    const [payment] = await db
      .insert(paymentsTable)
      .values({
        shipmentId: parseInt(shipmentId),
        amount: amount.toString(),
        currency,
        walletAddress,
      })
      .returning();
    res.status(201).json(payment);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/payments/:id
router.patch("/payments/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { txid, status, adminNotes } = req.body;

    const [existing] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const updates: Partial<typeof paymentsTable.$inferInsert> = { updatedAt: new Date() };

    // Customer submits TXID
    if (txid !== undefined && req.user!.role === "customer") {
      updates.txid = txid;
      updates.status = "under_review";
    }

    // Admin approves / rejects
    if (status && req.user!.role === "admin") {
      updates.status = status;
      updates.reviewedAt = new Date();
      if (adminNotes) updates.adminNotes = adminNotes;

      // If confirmed, update shipment status
      if (status === "confirmed") {
        await db
          .update(shipmentsTable)
          .set({ status: "processing", updatedAt: new Date() })
          .where(eq(shipmentsTable.id, existing.shipmentId));
      }
    }

    const [updated] = await db
      .update(paymentsTable)
      .set(updates)
      .where(eq(paymentsTable.id, id))
      .returning();

    // Notify customer + receiver (if receiver-pays confirmation)
    if (status) {
      const [shipment] = await db
        .select()
        .from(shipmentsTable)
        .where(eq(shipmentsTable.id, existing.shipmentId))
        .limit(1);
      if (shipment) {
        const msg =
          status === "confirmed"
            ? "Your payment has been confirmed. Your shipment is now being processed."
            : status === "rejected"
            ? `Your payment was rejected. ${adminNotes || "Please contact support."}`
            : "Your payment is under review.";
        await createNotification(shipment.customerId, "Payment Update", msg, "payment_update", id);

        // Email the receiver when an admin confirms a receiver-pays payment.
        // Gate on both admin role and the persisted status (not raw request body).
        if (
          req.user!.role === "admin" &&
          updated.status === "confirmed" &&
          shipment.receiverPays &&
          shipment.recipientEmail
        ) {
          const emailResult = await sendReceiverPaymentConfirmedEmail({
            to: shipment.recipientEmail,
            recipientName: shipment.recipientName ?? "",
            trackingNumber: shipment.trackingNumber,
            originCity: shipment.originCity,
            destinationCity: shipment.destinationCity,
            serviceType: shipment.serviceType ?? "standard",
            currency: existing.currency,
          });

          if (!emailResult.ok) {
            req.log.warn({
              event: "receiver_payment_confirmation_email_failed",
              paymentId: updated.id,
              shipmentId: existing.shipmentId,
              recipientEmail: shipment.recipientEmail,
              error: emailResult.error,
            }, "Receiver payment confirmation email failed to deliver");
          }

          res.json({ ...updated, emailDelivered: emailResult.ok });
          return;
        }
      }
    }

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/payments/:id/proof
router.post("/payments/:id/proof", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const proofUrl = `/api/uploads/${req.file.filename}`;
    const [updated] = await db
      .update(paymentsTable)
      .set({ paymentProofUrl: proofUrl, updatedAt: new Date() })
      .where(eq(paymentsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
