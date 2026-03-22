import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { voiceAssistanceHistoryTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const SAFE_KEYWORDS = [
  "how to open", "how to send", "how to call", "how to text",
  "how to find", "how to change", "how do i", "help me",
  "what is", "explain", "show me", "tell me"
];

const ESCALATE_KEYWORDS = [
  "chest pain", "heart attack", "emergency", "can't breathe",
  "investment", "wire transfer", "gift card", "send money",
  "legal advice", "contract", "lawsuit"
];

function classifyRequest(text: string): string {
  const lower = text.toLowerCase();
  if (ESCALATE_KEYWORDS.some(k => lower.includes(k))) return "escalate";
  if (lower.includes("scam") || lower.includes("suspicious") || lower.includes("fraud")) return "scam_check";
  if (lower.includes("text") || lower.includes("message") || lower.includes("sms")) return "texting";
  if (lower.includes("app") || lower.includes("install") || lower.includes("download")) return "apps";
  if (lower.includes("setting") || lower.includes("wifi") || lower.includes("bluetooth") || lower.includes("volume")) return "settings";
  return "other";
}

function generateEscalationResponse(request: string): string {
  const lower = request.toLowerCase();
  if (lower.includes("chest pain") || lower.includes("heart") || lower.includes("breathe")) {
    return "This sounds like a medical emergency. Please call 911 immediately or have someone nearby help you. Do not wait.";
  }
  if (lower.includes("money") || lower.includes("wire") || lower.includes("gift card")) {
    return "I want to help protect you — requests for wire transfers or gift cards are almost always scams. Please do not send any money. You can check with a family member first.";
  }
  return "That sounds like something important that needs expert help. I recommend talking to a family member or trusted person before taking any action. Should I help you contact someone?";
}

function generateTechResponse(request: string, category: string): string {
  const lower = request.toLowerCase();

  if (category === "texting") {
    if (lower.includes("send") || lower.includes("write")) {
      return "To send a text message: First, open your Messages app (the green speech bubble). Then tap the compose button in the top right corner. Type the person's name or phone number at the top, then type your message in the box at the bottom, and tap Send. Would you like me to walk through any step in more detail?";
    }
    return "For text messages, open the green Messages app on your phone. Your conversations will be listed there. Tap on a conversation to read or reply to it.";
  }

  if (category === "apps") {
    if (lower.includes("install") || lower.includes("download")) {
      return "To download an app: Open the App Store (iPhone) or Play Store (Android) — it looks like a small shopping bag or triangle. Tap the search icon and type the app name. Tap Get or Install next to the app, then follow the prompts. It may ask for your password.";
    }
    return "To open an app, look for its icon on your home screen and tap it once. If you can't find it, swipe down from the middle of your screen and type the app name to search for it.";
  }

  if (category === "settings") {
    if (lower.includes("wifi")) {
      return "To connect to WiFi: Open Settings (the gray gear icon), then tap WiFi. Make sure the toggle is green/on. Tap the name of your network and enter the password if asked. The WiFi symbol at the top of your screen will show when you're connected.";
    }
    if (lower.includes("volume")) {
      return "To adjust the volume, use the physical buttons on the side of your phone — the top button makes it louder, the bottom one makes it quieter. You can also go to Settings, then Sounds, to fine-tune the volume.";
    }
    return "For settings, open the Settings app (the gray gear icon). You can search for what you need at the top of the Settings screen.";
  }

  if (category === "scam_check") {
    return "That's a smart question to ask! If something seems suspicious, trust your gut. Never share your password, Social Security number, or bank information over the phone or by text. Real companies will never ask for gift card payments. Use the Scam Analyzer in SeniorShield to check suspicious messages.";
  }

  return `I'm here to help! ${request.includes("?") ? "Great question. " : ""}For the best help, try to be specific — for example: "How do I send a text to my daughter?" or "How do I connect to WiFi?" I'll guide you step by step.`;
}

router.post("/process-request", requireAuth, async (req: AuthRequest, res) => {
  const startTime = Date.now();
  try {
    const { request_text } = req.body;
    if (!request_text) {
      res.status(400).json({ error: "Bad Request", message: "request_text is required" });
      return;
    }

    const category = classifyRequest(request_text);
    let response_text: string;
    let success = true;
    let error_message: string | undefined;

    try {
      if (category === "escalate") {
        response_text = generateEscalationResponse(request_text);
      } else {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `You are SeniorShield, a patient, warm voice assistant for seniors aged 65+. 
Your job is to guide seniors through phone tasks step-by-step. Rules:
- Use very simple, clear language — no technical jargon
- Give numbered steps when explaining how to do something
- Keep responses under 120 words
- Be warm, encouraging and patient
- If someone asks about a potentially suspicious message or request, warn them gently
- Never automate anything — always guide the user to do it themselves
- End with "Does that help?" or a similar check-in`,
                },
                { role: "user", content: request_text }
              ],
              max_tokens: 200,
              temperature: 0.7,
            }),
          });
          const data = await response.json() as any;
          response_text = data.choices?.[0]?.message?.content || generateTechResponse(request_text, category);
        } else {
          response_text = generateTechResponse(request_text, category);
        }
      }
    } catch (aiErr) {
      success = false;
      error_message = "Could not generate AI response";
      response_text = generateTechResponse(request_text, category);
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    const [saved] = await db.insert(voiceAssistanceHistoryTable).values({
      user_id: req.user!.userId,
      request_text,
      response_text,
      task_category: category,
      success,
      error_message,
      duration_seconds: duration,
    }).returning();

    res.json({
      request_text,
      response_text,
      task_category: category,
      success,
      error_message,
      history_id: saved.id,
    });
  } catch (err) {
    req.log.error({ err }, "Voice request error");
    res.status(500).json({ error: "Internal Server Error", message: "I had trouble understanding that. Please try again." });
  }
});

router.get("/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const history = await db
      .select()
      .from(voiceAssistanceHistoryTable)
      .where(eq(voiceAssistanceHistoryTable.user_id, req.user!.userId))
      .orderBy(desc(voiceAssistanceHistoryTable.created_at))
      .limit(50);

    res.json({
      history: history.map(h => ({
        id: h.id,
        request_text: h.request_text,
        response_text: h.response_text,
        task_category: h.task_category,
        success: h.success,
        created_at: h.created_at,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Voice history error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
