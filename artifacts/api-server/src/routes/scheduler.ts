import { Router, Request, Response } from "express";
import { runReminderScheduler } from "../services/reminder-scheduler.js";
import { runDataCleanup } from "../services/data-cleanup.js";

const router = Router();

let lastCleanupRun = 0;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

router.post("/reminders", async (req: Request, res: Response) => {
  try {
    const schedulerSecret = req.headers["x-scheduler-secret"] || req.query.secret;
    if (!process.env.SCHEDULER_SECRET || schedulerSecret !== process.env.SCHEDULER_SECRET) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const result = await runReminderScheduler();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed: result.processed,
      sent: result.sent,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[Scheduler Route] Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/run/:secret", async (req: Request, res: Response) => {
  try {
    if (!process.env.SCHEDULER_SECRET || req.params.secret !== process.env.SCHEDULER_SECRET) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const result = await runReminderScheduler();

    let cleanupResult = null;
    const now = Date.now();
    if (now - lastCleanupRun >= CLEANUP_INTERVAL_MS) {
      lastCleanupRun = now;
      cleanupResult = await runDataCleanup();
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed: result.processed,
      sent: result.sent,
      errors: result.errors,
      cleanup: cleanupResult
        ? { totalDeleted: cleanupResult.totalDeleted, tables: cleanupResult.results }
        : null,
    });
  } catch (error) {
    console.error("[Scheduler Route] Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
