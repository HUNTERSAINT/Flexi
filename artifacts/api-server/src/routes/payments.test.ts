/**
 * Tests for the PATCH /api/payments/:id email-notification behaviour.
 *
 * Three behaviours are verified:
 *  1. Confirming a receiver-pays payment (with recipientEmail) triggers
 *     `sendReceiverPaymentConfirmedEmail` with the correct arguments.
 *  2. Confirming a non-receiver-pays payment does NOT trigger the email.
 *  3. Confirming a receiver-pays payment that has no recipientEmail does NOT
 *     trigger the email.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ─── Mocks (hoisted before any module import) ────────────────────────────────

vi.mock("@workspace/db", () => {
  const makeSelectChain = () => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
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
      update: vi.fn(() => makeUpdateChain()),
      insert: vi.fn(() => ({ values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([]) })),
    },
    paymentsTable: {
      id: "payments.id",
      status: "payments.status",
      shipmentId: "payments.shipmentId",
      createdAt: "payments.createdAt",
      customerId: "payments.customerId",
    },
    shipmentsTable: {
      id: "shipments.id",
      customerId: "shipments.customerId",
      status: "shipments.status",
    },
    eq: vi.fn((_col: unknown, _val: unknown) => "eq-expr"),
    and: vi.fn((...args: unknown[]) => args),
    count: vi.fn(() => ({ as: vi.fn() })),
    desc: vi.fn((col: unknown) => col),
  };
});

vi.mock("../lib/email.js", () => ({
  sendReceiverPaymentConfirmedEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmation: vi.fn().mockResolvedValue(undefined),
  sendReceiverPaysNotification: vi.fn().mockResolvedValue(undefined),
  sendStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
  sendDriverAssignedEmail: vi.fn().mockResolvedValue(undefined),
  sendDeliveryConfirmationEmail: vi.fn().mockResolvedValue(undefined),
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

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import app from "../app.js";
import { db } from "@workspace/db";
import { sendReceiverPaymentConfirmedEmail } from "../lib/email.js";
import { signToken } from "../middlewares/auth.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function adminToken() {
  return signToken({ id: 99, email: "admin@test.com", role: "admin", name: "Admin" });
}

/** A minimal payment record returned by the first db.select() call. */
const mockPayment = {
  id: 42,
  shipmentId: 7,
  amount: "100.00",
  currency: "BTC",
  walletAddress: "fake-btc-address",
  txid: "abc123",
  paymentProofUrl: null,
  status: "under_review",
  adminNotes: null,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** The record returned by db.update(paymentsTable)…returning(). */
const mockUpdatedPayment = { ...mockPayment, status: "confirmed", reviewedAt: new Date() };

/** A shipment where the receiver pays AND has an email address. */
const mockShipmentReceiverPays = {
  id: 7,
  customerId: 1,
  trackingNumber: "FR-0001",
  originCity: "Lagos",
  destinationCity: "Abuja",
  serviceType: "express",
  status: "processing",
  receiverPays: true,
  recipientEmail: "receiver@example.com",
  recipientName: "John Doe",
  updatedAt: new Date(),
};

/** A shipment where the SENDER pays. */
const mockShipmentSenderPays = {
  ...mockShipmentReceiverPays,
  receiverPays: false,
  recipientEmail: "receiver@example.com",
};

/** A receiver-pays shipment with NO recipientEmail. */
const mockShipmentNoEmail = {
  ...mockShipmentReceiverPays,
  recipientEmail: null,
};

// ─── Per-test mock setup helper ───────────────────────────────────────────────

/**
 * Configures the db mock so that:
 *  - The first  select().limit() returns `paymentRows` (payment lookup)
 *  - update(shipmentsTable) resolves cleanly (no returning needed)
 *  - update(paymentsTable).returning() returns `updatedPaymentRows`
 *  - The second select().limit() returns `shipmentRows`  (shipment lookup)
 */
function setupDbMocks(opts: {
  paymentRows?: object[];
  updatedPaymentRows?: object[];
  shipmentRows?: object[];
}) {
  const { paymentRows = [mockPayment], updatedPaymentRows = [mockUpdatedPayment], shipmentRows = [mockShipmentReceiverPays] } = opts;

  // select() is called twice: once for payment, once for shipment.
  // We return a fresh chain each call, with limit() configured per-call.
  let selectCallCount = 0;
  vi.mocked(db.select).mockImplementation(() => {
    selectCallCount++;
    const call = selectCallCount;
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        if (call === 1) return Promise.resolve(paymentRows);
        return Promise.resolve(shipmentRows);
      }),
      orderBy: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
    } as any;
  });

  // update() is called at most twice: once for shipments, once for payments.
  // The payments update needs .set().where().returning().
  let updateCallCount = 0;
  vi.mocked(db.update).mockImplementation(() => {
    updateCallCount++;
    if (updateCallCount === 1 && updatedPaymentRows.length > 0) {
      // When confirming, first update is shipmentsTable (no returning)
      return {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any;
    }
    // Second update (or only update when not confirming) is paymentsTable
    return {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(updatedPaymentRows),
        }),
      }),
    } as any;
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("PATCH /api/payments/:id — receiver payment confirmation email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers sendReceiverPaymentConfirmedEmail with correct arguments when admin confirms a receiver-pays payment that has a recipientEmail", async () => {
    setupDbMocks({ shipmentRows: [mockShipmentReceiverPays] });

    const res = await request(app)
      .patch("/api/payments/42")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ status: "confirmed" });

    expect(res.status).toBe(200);
    expect(vi.mocked(sendReceiverPaymentConfirmedEmail)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendReceiverPaymentConfirmedEmail)).toHaveBeenCalledWith({
      to: mockShipmentReceiverPays.recipientEmail,
      recipientName: mockShipmentReceiverPays.recipientName,
      trackingNumber: mockShipmentReceiverPays.trackingNumber,
      originCity: mockShipmentReceiverPays.originCity,
      destinationCity: mockShipmentReceiverPays.destinationCity,
      serviceType: mockShipmentReceiverPays.serviceType,
      currency: mockPayment.currency,
    });
  });

  it("does NOT trigger sendReceiverPaymentConfirmedEmail when the shipment is sender-pays", async () => {
    setupDbMocks({ shipmentRows: [mockShipmentSenderPays] });

    const res = await request(app)
      .patch("/api/payments/42")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ status: "confirmed" });

    expect(res.status).toBe(200);
    expect(vi.mocked(sendReceiverPaymentConfirmedEmail)).not.toHaveBeenCalled();
  });

  it("does NOT trigger sendReceiverPaymentConfirmedEmail when the shipment has no recipientEmail", async () => {
    setupDbMocks({ shipmentRows: [mockShipmentNoEmail] });

    const res = await request(app)
      .patch("/api/payments/42")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ status: "confirmed" });

    expect(res.status).toBe(200);
    expect(vi.mocked(sendReceiverPaymentConfirmedEmail)).not.toHaveBeenCalled();
  });
});
