import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import userRouter from "./user.js";
import voiceRouter from "./voice.js";
import scamRouter from "./scam.js";
import familyRouter from "./family.js";
import alertsRouter from "./alerts.js";
import billingRouter from "./billing.js";
import supportRouter from "./support.js";

const router: IRouter = Router();

router.use("/", healthRouter);
router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/voice", voiceRouter);
router.use("/scam", scamRouter);
router.use("/family", familyRouter);
router.use("/alerts", alertsRouter);
router.use("/billing", billingRouter);
router.use("/support", supportRouter);

export default router;
