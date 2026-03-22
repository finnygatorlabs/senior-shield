import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const alerts = await db
      .select()
      .from(alertsTable)
      .where(eq(alertsTable.recipient_id, req.user!.userId))
      .orderBy(desc(alertsTable.created_at))
      .limit(50);

    res.json({
      alerts: alerts.map(a => ({
        id: a.id,
        alert_type: a.alert_type,
        message: a.message,
        read: a.read,
        created_at: a.created_at,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Get alerts error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:alertId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { alertId } = req.params;
    const { read } = req.body;

    await db
      .update(alertsTable)
      .set({ read })
      .where(eq(alertsTable.id, alertId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Update alert error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
