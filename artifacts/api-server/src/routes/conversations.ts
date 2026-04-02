import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { conversationSessionsTable } from "@workspace/db";
import { eq, and, lt, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const RETENTION_DAYS = 7;

function expiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + RETENTION_DAYS);
  return d;
}

async function pruneExpired(userId: string) {
  await db
    .delete(conversationSessionsTable)
    .where(
      and(
        eq(conversationSessionsTable.user_id, userId),
        lt(conversationSessionsTable.expires_at, new Date())
      )
    );
}

// GET /api/conversations — list non-expired sessions newest-first
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    await pruneExpired(req.user!.userId);
    const sessions = await db
      .select()
      .from(conversationSessionsTable)
      .where(eq(conversationSessionsTable.user_id, req.user!.userId))
      .orderBy(desc(conversationSessionsTable.started_at));
    res.json(sessions);
  } catch (err) {
    req.log.error({ err }, "Get conversations error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/conversations — create a new session
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: "messages must be an array" });
      return;
    }
    const [session] = await db
      .insert(conversationSessionsTable)
      .values({
        user_id: req.user!.userId,
        messages,
        expires_at: expiresAt(),
      })
      .returning();
    res.status(201).json(session);
  } catch (err) {
    req.log.error({ err }, "Create conversation error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/conversations/:id — update messages in an existing session
router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: "messages must be an array" });
      return;
    }
    const [existing] = await db
      .select({ id: conversationSessionsTable.id })
      .from(conversationSessionsTable)
      .where(
        and(
          eq(conversationSessionsTable.id, id),
          eq(conversationSessionsTable.user_id, req.user!.userId)
        )
      )
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    const [updated] = await db
      .update(conversationSessionsTable)
      .set({ messages })
      .where(eq(conversationSessionsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update conversation error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/conversations/:id — delete a session
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db
      .delete(conversationSessionsTable)
      .where(
        and(
          eq(conversationSessionsTable.id, id),
          eq(conversationSessionsTable.user_id, req.user!.userId)
        )
      );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete conversation error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
