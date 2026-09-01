/**
 * Tests for shipment-route email-notification behaviour.
 *
 * Four behaviours are verified:
 *  1. POST /api/shipments — sendBookingConfirmation is triggered with the
 *     correct arguments for every new booking.
 *  2. POST /api/shipments (receiver-pays) — sendReceiverPaysNotification is
 *     triggered when receiverPays=true and recipientEmail is provided.
 *  3. POST /api/shipments (receiver-pays, no email) — sendReceiverPaysNotification
 *     is NOT triggered when recipientEmail is absent.
 *  4. PATCH /api/shipments/:id — creates a tracking event and sends
 *     sendStatusUpdateEmail (to both the sender-customer and the recipient) when
 *     the status actually changes, and does neither when the status is unchanged.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ─── Mocks (hoisted before any module import) ────────────────────────────────

vi.mock("@workspace/db", () => {
  const makeSelectChain = () => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
  });

  const makeInsertChain = () => ({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    }),
  });

  const makeUpdateChain = () => ({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  });

  return {
    db: {
      select: vi.fn(() => makeSelectChain()),
      insert: vi.fn(() => makeInsertChain()),
      update: vi.fn(() => makeUpdateChain()),
    },
    shipmentsTable: {
      id: "shipments.id",
      customerId: "shipments.customerId",
      driverId: "shipments.driverId",
      status: "shipments.status",
      trackingNumber: "shipments.trackingNumber",
      recipientEmail: "shipments.recipientEmail",
    },
    trackingEventsTable: {
      shipmentId: "tracking_events.shipmentId",
      createdAt: "tracking_events.createdAt",
    },
    paymentsTable: {
      id: "payments.id",
      shipmentId: "payments.shipmentId",
    },
    usersTable: {
      id: "users.id",
      email: "users.email",
      name: "users.name",
      role: "users.role",
    },
    eq: vi.fn((_col: unknown, _val: unknown) => "eq-expr"),
    and: vi.fn((...args: unknown[]) => args),
    ilike: vi.fn(() => "ilike-expr"),
    or: vi.fn(() => "or-expr"),
    count: vi.fn(() => ({ as: vi.fn() })),
    desc: vi.fn((col: unknown) => col),
  };
});

vi.mock("../lib/email.js", () => ({
  sendBookingConfirmation: vi.fn().mockResolvedValue(undefined),
  sendReceiverPaysNotification: vi.fn().mockResolvedValue(undefined),
  sendStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
  sendDriverAssignedEmail: vi.fn().mockResolvedValue(undefined),
  sendDeliveryConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendReceiverPaymentConfirmedEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/notifications.js", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/wallets.js", () => ({
  getWalletAddresses: vi.fn(() => ({
    BTC: "fake-btc-address",
    ETH: "fake-eth-address",
    USDT_TRC20: "fake-usdt-address",
    USDT_ERC20: "fake-usdt-erc20-address",
  })),
}));

vi.mock("../lib/trackingNumber.js", () => ({
  generateTrackingNumber: vi.fn().mockReturnValue("FR-TEST-001"),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import app from "../app.js";
import { db } from "@workspace/db";
import {
  sendBookingConfirmation,
  sendReceiverPaysNotification,
  sendStatusUpdateEmail,
} from "../lib/email.js";
import { signToken } from "../middlewares/auth.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function customerToken() {
  return signToken({ id: 1, email: "customer@test.com", role: "customer", name: "Test Customer" });
}

function adminToken() {
  return signToken({ id: 99, email: "admin@test.com", role: "admin", name: "Admin" });
}

/** Base shipment returned by db.insert(shipmentsTable). */
const mockShipment = {
  id: 10,
  trackingNumber: "FR-TEST-001",
  customerId: 1,
  driverId: null,
  serviceType: "standard",
  status: "pending",
  originAddress: "1 Lagos St",
  originCity: "Lagos",
  originState: "LA",
  originZip: "100001",
  destinationAddress: "1 Abuja Ave",
  destinationCity: "Abuja",
  destinationState: "AB",
  destinationZip: "900001",
  weightKg: "5",
  dimensions: null,
  description: null,
  senderName: "Test Customer",
  senderPhone: null,
  recipientName: "Jane Receiver",
  recipientPhone: null,
  recipientEmail: "receiver@example.com",
  receiverPays: false,
  estimatedDelivery: null,
  deliveryProofUrl: null,
  totalAmount: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Minimal body for POST /api/shipments. */
const baseBookingBody = {
  originAddress: "1 Lagos St",
  originCity: "Lagos",
  originState: "LA",
  originZip: "100001",
  destinationAddress: "1 Abuja Ave",
  destinationCity: "Abuja",
  destinationState: "AB",
  destinationZip: "900001",
  weightKg: 5,
  serviceType: "standard",
  recipientName: "Jane Receiver",
  recipientEmail: "receiver@example.com",
  receiverPays: false,
};

/**
 * Configures db mocks for POST /api/shipments.
 *
 * Call sequence:
 *  - db.select() — tracking-number uniqueness check → [] (no collision)
 *  - db.insert() × 1 — shipment row → shipmentRow
 *  - db.insert() × 2 — tracking event row → [{ id: 1 }]
 */
function setupPostShipmentMocks(shipmentRow: object = mockShipment) {
  vi.mocked(db.select).mockImplementation(() => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
  } as any));

  let insertCallCount = 0;
  vi.mocked(db.insert).mockImplementation(() => {
    insertCallCount++;
    const callNum = insertCallCount;
    return {
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(callNum === 1 ? [shipmentRow] : [{ id: 1 }]),
      }),
    } as any;
  });
}

/**
 * Configures db mocks for PATCH /api/shipments/:id.
 *
 * Call sequence:
 *  - db.select() × 1 — existing shipment lookup → existingShipment
 *  - db.update()     — shipment update          → updatedShipment
 *  - db.select() × 2 — customer email lookup    → customerRow
 */
function setupPatchShipmentMocks(opts: {
  existingShipment: object;
  updatedShipment: object;
  customerRow: object;
}) {
  const { existingShipment, updatedShipment, customerRow } = opts;

  let selectCallCount = 0;
  vi.mocked(db.select).mockImplementation(() => {
    selectCallCount++;
    const call = selectCallCount;
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() =>
        Promise.resolve(call === 1 ? [existingShipment] : [customerRow]),
      ),
      orderBy: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
    } as any;
  });

  vi.mocked(db.update).mockImplementation(() => ({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedShipment]),
      }),
    }),
  } as any));
}

// ─── Tests: POST /api/shipments ───────────────────────────────────────────────

describe("POST /api/shipments — booking confirmation emails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPostShipmentMocks();
  });

  it("triggers sendBookingConfirmation with correct arguments when a new shipment is booked", async () => {
    const res = await request(app)
      .post("/api/shipments")
      .set("Authorization", `Bearer ${customerToken()}`)
      .send(baseBookingBody);

    expect(res.status).toBe(201);
    expect(vi.mocked(sendBookingConfirmation)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendBookingConfirmation)).toHaveBeenCalledWith({
      to: "customer@test.com",
      name: "Test Customer",
      trackingNumber: mockShipment.trackingNumber,
      originCity: baseBookingBody.originCity,
      destinationCity: baseBookingBody.destinationCity,
      serviceType: baseBookingBody.serviceType,
      receiverPays: false,
    });
  });

  it("triggers sendReceiverPaysNotification with correct arguments for receiver-pays bookings", async () => {
    const receiverPaysBody = {
      ...baseBookingBody,
      receiverPays: true,
      recipientEmail: "receiver@example.com",
      recipientName: "Jane Receiver",
    };
    const receiverPaysShipment = { ...mockShipment, receiverPays: true };
    setupPostShipmentMocks(receiverPaysShipment);

    const res = await request(app)
      .post("/api/shipments")
      .set("Authorization", `Bearer ${customerToken()}`)
      .send(receiverPaysBody);

    expect(res.status).toBe(201);
    expect(vi.mocked(sendReceiverPaysNotification)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendReceiverPaysNotification)).toHaveBeenCalledWith({
      to: "receiver@example.com",
      recipientName: "Jane Receiver",
      senderName: "Test Customer",
      trackingNumber: mockShipment.trackingNumber,
      originCity: receiverPaysBody.originCity,
      destinationCity: receiverPaysBody.destinationCity,
      serviceType: receiverPaysBody.serviceType,
    });
  });

  it("does NOT trigger sendReceiverPaysNotification when receiverPays is false", async () => {
    const res = await request(app)
      .post("/api/shipments")
      .set("Authorization", `Bearer ${customerToken()}`)
      .send({ ...baseBookingBody, receiverPays: false });

    expect(res.status).toBe(201);
    expect(vi.mocked(sendReceiverPaysNotification)).not.toHaveBeenCalled();
  });

  it("does NOT trigger sendReceiverPaysNotification when receiverPays is true but recipientEmail is absent", async () => {
    const { recipientEmail, ...bodyWithoutEmail } = baseBookingBody;

    const res = await request(app)
      .post("/api/shipments")
      .set("Authorization", `Bearer ${customerToken()}`)
      .send({ ...bodyWithoutEmail, receiverPays: true });

    expect(res.status).toBe(201);
    expect(vi.mocked(sendReceiverPaysNotification)).not.toHaveBeenCalled();
  });
});

// ─── Tests: PATCH /api/shipments/:id ─────────────────────────────────────────

describe("PATCH /api/shipments/:id — status update email", () => {
  const existingShipment = {
    ...mockShipment,
    status: "pending",
    recipientEmail: "receiver@example.com",
    recipientName: "Jane Receiver",
  };

  const mockCustomer = { email: "customer@test.com", name: "Test Customer" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers sendStatusUpdateEmail to the customer when the shipment status changes", async () => {
    setupPatchShipmentMocks({
      existingShipment,
      updatedShipment: { ...existingShipment, status: "in_transit" },
      customerRow: mockCustomer,
    });

    const res = await request(app)
      .patch("/api/shipments/10")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ status: "in_transit" });

    expect(res.status).toBe(200);
    expect(vi.mocked(db.insert)).toHaveBeenCalledWith(expect.objectContaining({ shipmentId: "tracking_events.shipmentId" }));
    expect(vi.mocked(sendStatusUpdateEmail)).toHaveBeenCalledWith({
      to: mockCustomer.email,
      name: mockCustomer.name,
      trackingNumber: existingShipment.trackingNumber,
      status: "in_transit",
      originCity: existingShipment.originCity,
      destinationCity: existingShipment.destinationCity,
    });
  });

  it("also triggers sendStatusUpdateEmail to the recipient when they have an email on file", async () => {
    setupPatchShipmentMocks({
      existingShipment,
      updatedShipment: { ...existingShipment, status: "in_transit" },
      customerRow: mockCustomer,
    });

    const res = await request(app)
      .patch("/api/shipments/10")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ status: "in_transit" });

    expect(res.status).toBe(200);
    // Called twice: once for the customer, once for the recipient
    expect(vi.mocked(sendStatusUpdateEmail)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendStatusUpdateEmail)).toHaveBeenCalledWith({
      to: existingShipment.recipientEmail,
      name: existingShipment.recipientName,
      trackingNumber: existingShipment.trackingNumber,
      status: "in_transit",
      originCity: existingShipment.originCity,
      destinationCity: existingShipment.destinationCity,
    });
  });

  it("does NOT trigger sendStatusUpdateEmail when the status is unchanged", async () => {
    const unchangedShipment = { ...existingShipment, status: "pending" };
    setupPatchShipmentMocks({
      existingShipment: unchangedShipment,
      updatedShipment: unchangedShipment,
      customerRow: mockCustomer,
    });

    const res = await request(app)
      .patch("/api/shipments/10")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ status: "pending" }); // same as existing

    expect(res.status).toBe(200);
    expect(vi.mocked(sendStatusUpdateEmail)).not.toHaveBeenCalled();
  });

  it("does NOT trigger sendStatusUpdateEmail to the recipient when they have no email on file", async () => {
    const shipmentNoRecipientEmail = { ...existingShipment, recipientEmail: null };
    setupPatchShipmentMocks({
      existingShipment: shipmentNoRecipientEmail,
      updatedShipment: { ...shipmentNoRecipientEmail, status: "in_transit" },
      customerRow: mockCustomer,
    });

    const res = await request(app)
      .patch("/api/shipments/10")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ status: "in_transit" });

    expect(res.status).toBe(200);
    // Only called once (for the customer), not for the recipient
    expect(vi.mocked(sendStatusUpdateEmail)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendStatusUpdateEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: mockCustomer.email }),
    );
  });
});
