import { Router } from "express";
import { db, shipmentsTable, trackingEventsTable, paymentsTable, pricingTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getWalletAddresses } from "../lib/wallets";
import { createNotification } from "../lib/notifications";

const router = Router();

const CURRENCIES = ["BTC", "ETH", "USDT_TRC20", "USDT_ERC20", "USDC", "LTC"] as const;

// GET /api/track/:trackingNumber — public
router.get("/track/:trackingNumber", async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const [shipment] = await db
      .select({
        id: shipmentsTable.id,
        trackingNumber: shipmentsTable.trackingNumber,
        status: shipmentsTable.status,
        serviceType: shipmentsTable.serviceType,
        originCity: shipmentsTable.originCity,
        originState: shipmentsTable.originState,
        destinationCity: shipmentsTable.destinationCity,
        destinationState: shipmentsTable.destinationState,
        estimatedDelivery: shipmentsTable.estimatedDelivery,
        createdAt: shipmentsTable.createdAt,
        receiverPays: shipmentsTable.receiverPays,
        senderName: shipmentsTable.senderName,
        recipientName: shipmentsTable.recipientName,
        weightKg: shipmentsTable.weightKg,
        totalAmount: shipmentsTable.totalAmount,
      })
      .from(shipmentsTable)
      .where(eq(shipmentsTable.trackingNumber, trackingNumber))
      .limit(1);

    if (!shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }

    const [events, payments] = await Promise.all([
      db
        .select()
        .from(trackingEventsTable)
        .where(eq(trackingEventsTable.shipmentId, shipment.id))
        .orderBy(trackingEventsTable.createdAt),
      db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.shipmentId, shipment.id))
        .limit(1),
    ]);

    // Calculate estimated amount from pricing if not already set
    let estimatedAmount: string | null = shipment.totalAmount ?? null;
    if (!estimatedAmount && shipment.weightKg) {
      const [pricing] = await db
        .select()
        .from(pricingTable)
        .where(eq(pricingTable.serviceType, shipment.serviceType ?? "standard"))
        .limit(1);
      if (pricing) {
        const amount = Number(pricing.basePriceUsd) + Number(shipment.weightKg) * Number(pricing.pricePerKg);
        estimatedAmount = amount.toFixed(2);
      }
    }

    res.json({
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      serviceType: shipment.serviceType,
      originCity: shipment.originCity,
      originState: shipment.originState,
      destinationCity: shipment.destinationCity,
      destinationState: shipment.destinationState,
      estimatedDelivery: shipment.estimatedDelivery,
      createdAt: shipment.createdAt,
      receiverPays: shipment.receiverPays,
      senderName: shipment.senderName,
      recipientName: shipment.recipientName,
      estimatedAmount,
      events,
      payment: payments[0] ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/track/:trackingNumber/pay — public, for receiver-pays shipments
router.post("/track/:trackingNumber/pay", async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { currency, txid } = req.body;

    const [shipment] = await db
      .select()
      .from(shipmentsTable)
      .where(eq(shipmentsTable.trackingNumber, trackingNumber))
      .limit(1);

    if (!shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }

    if (!shipment.receiverPays) {
      res.status(400).json({ error: "This shipment is not set to receiver pays" });
      return;
    }

    // If txid provided, update existing payment with txid
    if (txid) {
      const [existingPayment] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.shipmentId, shipment.id))
        .limit(1);

      if (!existingPayment) {
        res.status(404).json({ error: "No payment record found" });
        return;
      }

      const [updated] = await db
        .update(paymentsTable)
        .set({ txid, status: "under_review", updatedAt: new Date() })
        .where(eq(paymentsTable.id, existingPayment.id))
        .returning();

      await createNotification(
        shipment.customerId,
        "Receiver Payment Submitted",
        `The receiver has submitted payment for shipment ${trackingNumber}. It is now under review.`,
        "payment_update",
        existingPayment.id
      );

      res.json(updated);
      return;
    }

    // Create new payment record
    if (!currency || !CURRENCIES.includes(currency as any)) {
      res.status(400).json({ error: "Valid currency is required" });
      return;
    }

    // Check no confirmed/pending payment already exists
    const [existingPayment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.shipmentId, shipment.id))
      .limit(1);

    if (existingPayment && existingPayment.status === "confirmed") {
      res.status(409).json({ error: "Payment already confirmed for this shipment" });
      return;
    }

    // Calculate amount
    let amount = shipment.totalAmount ? Number(shipment.totalAmount) : 0;
    if (!amount && shipment.weightKg) {
      const [pricing] = await db
        .select()
        .from(pricingTable)
        .where(eq(pricingTable.serviceType, shipment.serviceType ?? "standard"))
        .limit(1);
      if (pricing) {
        amount = Number(pricing.basePriceUsd) + Number(shipment.weightKg) * Number(pricing.pricePerKg);
      }
    }

    const wallets = getWalletAddresses();
    const walletAddress = wallets[currency as keyof typeof wallets];
    if (!walletAddress) {
      res.status(400).json({ error: "Unsupported currency" });
      return;
    }

    // Upsert: delete old pending payment if exists, create new one
    if (existingPayment && existingPayment.status === "awaiting_payment") {
      await db.delete(paymentsTable).where(eq(paymentsTable.id, existingPayment.id));
    }

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        shipmentId: shipment.id,
        amount: amount.toFixed(2),
        currency,
        walletAddress,
        status: "awaiting_payment",
      })
      .returning();

    res.status(201).json({
      ...payment,
      estimatedAmount: amount.toFixed(2),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
