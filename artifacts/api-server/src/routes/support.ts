import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { supportTicketsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const FAQ_ITEMS = [
  {
    id: "1",
    question: "How do I use the voice assistant?",
    answer: "Tap the large microphone button on the home screen and speak your question. SeniorShield will listen and guide you step by step. You can ask things like \"How do I send a text?\" or \"How do I connect to WiFi?\"",
    category: "voice",
  },
  {
    id: "2",
    question: "How do I add a family member for alerts?",
    answer: "Go to Family Alerts in the menu and tap \"Add Family Member\". Enter their email address and select your relationship. They will receive alerts if a scam is detected.",
    category: "family",
  },
  {
    id: "3",
    question: "What does the scam analyzer do?",
    answer: "The Scam Analyzer checks messages, emails, or texts for signs of fraud. Paste the suspicious text and SeniorShield will tell you if it looks safe, suspicious, or high-risk — and explain why.",
    category: "scam",
  },
  {
    id: "4",
    question: "How do I upgrade to Premium?",
    answer: "Go to the Subscription section from the menu. You can choose a monthly plan ($12.99/month) or annual plan ($129.99/year) for savings. Premium gives you unlimited voice requests and advanced scam detection.",
    category: "billing",
  },
  {
    id: "5",
    question: "Can I change the voice gender or speed?",
    answer: "Yes! Go to Settings, then Voice & Audio. You can choose between a female or male voice, adjust the speaking speed, and control the volume to your preference.",
    category: "settings",
  },
  {
    id: "6",
    question: "What if the voice assistant didn't understand me?",
    answer: "Try typing your question instead — there's a text input option on the home screen. Make sure you're in a quiet place and speak clearly. You can also try rephrasing your question.",
    category: "voice",
  },
  {
    id: "7",
    question: "Is my information private and secure?",
    answer: "Yes. SeniorShield uses bank-level encryption to protect your data. We never sell your personal information. You can control what data is collected in Settings under Privacy & Security.",
    category: "privacy",
  },
  {
    id: "8",
    question: "How do I contact real support?",
    answer: "You can submit a support ticket through the Help & Support screen. Our team responds within 24 hours. For urgent issues, call us at 1-800-SENIOR-1.",
    category: "support",
  },
];

router.get("/faq", (req, res) => {
  res.json({ items: FAQ_ITEMS });
});

router.get("/tickets", requireAuth, async (req: AuthRequest, res) => {
  try {
    const tickets = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.user_id, req.user!.userId))
      .orderBy(desc(supportTicketsTable.created_at));

    res.json({ tickets });
  } catch (err) {
    req.log.error({ err }, "Get tickets error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/create-ticket", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      res.status(400).json({ error: "Bad Request", message: "subject and message are required" });
      return;
    }

    const [ticket] = await db.insert(supportTicketsTable).values({
      user_id: req.user!.userId,
      subject,
      message,
      status: "open",
      priority: "normal",
    }).returning();

    res.json({
      success: true,
      ticket_id: ticket.id,
      status: ticket.status,
    });
  } catch (err) {
    req.log.error({ err }, "Create ticket error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
