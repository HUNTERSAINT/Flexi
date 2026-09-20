import { Router, type IRouter } from "express";
import path from "path";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import shipmentsRouter from "./shipments";
import paymentsRouter from "./payments";
import driversRouter from "./drivers";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import pricingRouter from "./pricing";
import walletsRouter from "./wallets";
import trackingRouter from "./tracking";
import express from "express";
import fs from "fs";

const router: IRouter = Router();

// Static uploads
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
router.use("/uploads", express.static(UPLOADS_DIR));

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(shipmentsRouter);
router.use(paymentsRouter);
router.use(driversRouter);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(pricingRouter);
router.use(walletsRouter);
router.use(trackingRouter);

export default router;
