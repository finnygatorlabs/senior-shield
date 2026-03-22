import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { familyRelationshipsTable, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/members", requireAuth, async (req: AuthRequest, res) => {
  try {
    const relationships = await db
      .select()
      .from(familyRelationshipsTable)
      .where(eq(familyRelationshipsTable.senior_id, req.user!.userId));

    const members = await Promise.all(
      relationships.map(async (rel) => {
        const [member] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, rel.adult_child_id!))
          .limit(1);

        return {
          id: rel.id,
          email: member?.email || "unknown",
          first_name: member?.first_name,
          last_name: member?.last_name,
          relationship: rel.relationship,
          scam_alerts: rel.scam_alerts,
          weekly_summary: rel.weekly_summary,
          created_at: rel.created_at,
        };
      })
    );

    res.json({ members });
  } catch (err) {
    req.log.error({ err }, "Get family members error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/add-member", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { adult_child_email, relationship } = req.body;
    if (!adult_child_email || !relationship) {
      res.status(400).json({ error: "Bad Request", message: "adult_child_email and relationship are required" });
      return;
    }

    const [adultChild] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, adult_child_email))
      .limit(1);

    let adultChildId: string;
    if (adultChild) {
      adultChildId = adultChild.id;
    } else {
      const { hashPassword } = await import("../lib/auth.js");
      const tempPassword = hashPassword(Math.random().toString(36) + "Senior2024!");
      const [newUser] = await db.insert(usersTable).values({
        email: adult_child_email,
        password_hash: tempPassword,
        user_type: "adult_child",
      }).returning();
      adultChildId = newUser.id;
    }

    await db.insert(familyRelationshipsTable).values({
      senior_id: req.user!.userId,
      adult_child_id: adultChildId,
      relationship,
      scam_alerts: true,
      weekly_summary: true,
      email_alerts: true,
    }).onConflictDoNothing();

    res.json({ success: true, message: `${adult_child_email} has been added to your family alerts.` });
  } catch (err) {
    req.log.error({ err }, "Add family member error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/member/:memberId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { memberId } = req.params;
    await db
      .delete(familyRelationshipsTable)
      .where(eq(familyRelationshipsTable.id, memberId));

    res.json({ success: true, message: "Family member removed" });
  } catch (err) {
    req.log.error({ err }, "Remove family member error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
