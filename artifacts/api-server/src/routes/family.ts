import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { familyRelationshipsTable, usersTable, userTiersTable } from "@workspace/db";
import { eq, or, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";
import { sendFamilyMemberNotificationEmail } from "../lib/email.js";

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

const FREE_FAMILY_LIMIT = 1;
const PREMIUM_FAMILY_LIMIT = 5;

router.post("/add-member", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { adult_child_email, relationship, name } = req.body;
    if (!adult_child_email || !relationship) {
      res.status(400).json({ error: "Bad Request", message: "adult_child_email and relationship are required" });
      return;
    }

    let firstName: string | undefined;
    let lastName: string | undefined;
    if (name && typeof name === "string") {
      const parts = name.trim().split(/\s+/);
      firstName = parts[0];
      lastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
    }

    const [tier] = await db.select().from(userTiersTable).where(eq(userTiersTable.user_id, req.user!.userId)).limit(1);
    const isPremium = !!(tier && (tier.tier === "premium" || tier.tier === "premium_paid"));
    const maxMembers = isPremium ? PREMIUM_FAMILY_LIMIT : FREE_FAMILY_LIMIT;

    const existingMembers = await db
      .select()
      .from(familyRelationshipsTable)
      .where(eq(familyRelationshipsTable.senior_id, req.user!.userId));

    if (existingMembers.length >= maxMembers) {
      if (!isPremium) {
        res.status(403).json({
          error: "Upgrade required",
          message: `Free accounts can add up to ${FREE_FAMILY_LIMIT} family member. Upgrade to Premium to add up to ${PREMIUM_FAMILY_LIMIT} family members.`,
        });
      } else {
        res.status(400).json({
          error: "Limit reached",
          message: `You can add up to ${PREMIUM_FAMILY_LIMIT} family members. Please remove a member before adding a new one.`,
        });
      }
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
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
      }).returning();
      adultChildId = newUser.id;
    }

    if (firstName && adultChild && !adultChild.first_name) {
      await db.update(usersTable).set({
        first_name: firstName,
        ...(lastName ? { last_name: lastName } : {}),
      }).where(eq(usersTable.id, adultChildId));
    }

    const inserted = await db.insert(familyRelationshipsTable).values({
      senior_id: req.user!.userId,
      adult_child_id: adultChildId,
      relationship,
      scam_alerts: true,
      weekly_summary: true,
      email_alerts: true,
    }).onConflictDoNothing().returning();

    if (inserted.length === 0) {
      res.json({ success: true, message: `${adult_child_email} is already in your family alerts.` });
      return;
    }

    const [senior] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    const seniorDisplayName = senior?.first_name
      ? `${senior.first_name}${senior.last_name ? " " + senior.last_name : ""}`
      : "Your loved one";

    const [adultChildRecord] = await db.select().from(usersTable).where(eq(usersTable.id, adultChildId)).limit(1);
    const recipientName = adultChildRecord?.first_name || firstName || null;

    try {
      await sendFamilyMemberNotificationEmail(
        adult_child_email,
        recipientName,
        seniorDisplayName,
        relationship,
      );
    } catch (emailErr) {
      req.log.warn({ emailErr, recipientEmail: adult_child_email }, "Family notification email failed — member still added successfully");
    }

    res.json({ success: true, message: `${adult_child_email} has been added to your family alerts.` });
  } catch (err) {
    req.log.error({ err }, "Add family member error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/member/:memberId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { memberId } = req.params;
    const deleted = await db
      .delete(familyRelationshipsTable)
      .where(and(
        eq(familyRelationshipsTable.id, memberId),
        eq(familyRelationshipsTable.senior_id, req.user!.userId),
      ))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Not Found", message: "Family member not found." });
      return;
    }

    res.json({ success: true, message: "Family member removed" });
  } catch (err) {
    req.log.error({ err }, "Remove family member error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
