import { Router } from "express";
import { db, shipmentsTable, trackingEventsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

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
      })
      .from(shipmentsTable)
      .where(eq(shipmentsTable.trackingNumber, trackingNumber))
      .limit(1);

    if (!shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }

    const events = await db
      .select()
      .from(trackingEventsTable)
      .where(eq(trackingEventsTable.shipmentId, shipment.id))
      .orderBy(trackingEventsTable.createdAt);

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
      events,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
