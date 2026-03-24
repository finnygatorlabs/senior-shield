import { Router, IRouter } from "express";
import { createRequire } from "module";
import { db } from "@workspace/db";
import { voiceAssistanceHistoryTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const require = createRequire(import.meta.url);

// Map our voice labels to Microsoft Edge Neural TTS voices
// AriaNeural = warm, conversational female (like Sol/Maple)
// DavisNeural = calm, deep male (like Cove/Spruce)
const EDGE_VOICE_MAP: Record<string, string> = {
  nova: "en-US-AriaNeural",
  shimmer: "en-US-JennyNeural",
  alloy: "en-US-AriaNeural",
  ash: "en-US-JennyNeural",
  coral: "en-US-JennyNeural",
  onyx: "en-US-DavisNeural",
  echo: "en-US-GuyNeural",
  fable: "en-US-TonyNeural",
  sage: "en-US-DavisNeural",
  verse: "en-US-TonyNeural",
};

async function synthesiseWithEdgeTTS(text: string, voice: string): Promise<Buffer> {
  const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
  const edgeVoice = EDGE_VOICE_MAP[voice] || "en-US-AriaNeural";
  const tts = new MsEdgeTTS();
  await tts.setMetadata(edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const stream = tts.toStream(text);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any));
  }
  return Buffer.concat(chunks);
}

const router: IRouter = Router();

const ESCALATE_KEYWORDS = [
  "chest pain", "heart attack", "emergency", "can't breathe", "can not breathe",
  "wire transfer", "gift card", "send money now",
  "lawsuit", "legal notice",
];

function classifyRequest(text: string): string {
  const lower = text.toLowerCase();
  if (ESCALATE_KEYWORDS.some(k => lower.includes(k))) return "escalate";
  if (lower.includes("scam") || lower.includes("suspicious") || lower.includes("fraud")) return "scam_check";
  return "general";
}

function generateEscalationResponse(request: string): string {
  const lower = request.toLowerCase();
  if (lower.includes("chest pain") || lower.includes("heart") || lower.includes("breathe")) {
    return "This sounds like a medical emergency. Please call 911 immediately or have someone nearby help you. Do not wait.";
  }
  if (lower.includes("money") || lower.includes("wire") || lower.includes("gift card")) {
    return "I want to help protect you — requests for wire transfers or gift cards are almost always scams. Please don't send any money, and check with a family member first.";
  }
  return "That sounds important. I'd recommend talking with a family member or trusted person before taking any action. Would you like help contacting someone?";
}

router.post("/process-request", requireAuth, async (req: AuthRequest, res) => {
  const startTime = Date.now();
  try {
    const { request_text, conversation_history } = req.body;
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
        if (!openaiKey) {
          response_text = "I'm sorry, I'm not fully set up yet. Please ask again in a moment.";
        } else {
          const history = Array.isArray(conversation_history)
            ? conversation_history.slice(-10).filter(
                (m: any) => m && typeof m.role === "string" && typeof m.content === "string"
              )
            : [];

          const systemPrompt = `You are a warm, caring AI companion named by your user, working inside SeniorShield — a safety app designed for seniors aged 65 and older. Think of yourself as a trusted friend who happens to be very patient and knowledgeable.

Your personality:
- Speak naturally and warmly, like a real conversation between friends
- Never sound robotic, clinical, or overly formal
- Be genuinely encouraging — seniors often feel anxious about technology
- Use short, clear sentences. Never use jargon or technical terms without explaining them
- When giving instructions, say each step as a plain sentence on its own line, for example: "First, tap the Settings icon. Then scroll down to Wi-Fi."

Your capabilities:
- Help seniors with everyday phone and tablet tasks (texting, calls, apps, WiFi, photos, settings)
- Gently identify and warn about potential scams (you've learned the common patterns)
- Provide emotional support and a friendly ear
- Remember what was said earlier in this conversation and build on it
- Learn the user's preferences and situation from what they share

FORMATTING RULES — these are mandatory, never break them:
- NEVER use markdown: no asterisks (**bold** or *italic*), no hashtags (#), no hyphens as bullets (-), no underscores, no backticks, no numbered lists with dots (1.), no symbols of any kind
- Write plain conversational sentences only — the way you would speak out loud to a friend
- Separate steps with natural language like "First...", "Next...", "Then...", "Finally..." instead of symbols or bullet points
- Keep responses under 150 words unless giving multi-step instructions

Critical rules:
- NEVER automate anything on their behalf — always guide them to do it themselves
- If someone sounds confused or frustrated, reassure them first before explaining
- Always end with a gentle check-in like "Does that make sense?" or "How did that go?"
- If you detect signs of a scam (urgency, gift cards, secrecy, too-good-to-be-true), flag it warmly but clearly`;

          const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: request_text },
          ];

          const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages,
              max_tokens: 250,
              temperature: 0.75,
            }),
          });
          const data = await aiRes.json() as any;
          response_text = data.choices?.[0]?.message?.content?.trim() ||
            "I'm sorry, I had a little trouble with that. Could you try asking me again?";
        }
      }
    } catch (aiErr) {
      success = false;
      error_message = "Could not generate AI response";
      response_text = "I'm sorry, I couldn't reach my thinking engine just now. Please try again in a moment!";
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

router.post("/tts", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { text, voice } = req.body as { text?: string; voice?: string };
    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const VALID_VOICES = ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse"];
    const safeVoice = VALID_VOICES.includes(voice || "") ? voice! : "nova";
    req.log.info({ voice: safeVoice }, "TTS request");

    // Try OpenAI TTS first (best quality) if the key looks valid
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey.startsWith("sk-")) {
      try {
        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "tts-1",
            input: text.slice(0, 4096),
            voice: safeVoice,
            speed: 1.0,
          }),
        });
        if (ttsRes.ok) {
          const arrayBuffer = await ttsRes.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          req.log.info({ voice: safeVoice, engine: "openai" }, "TTS success");
          res.json({ audio: base64, contentType: "audio/mpeg" });
          return;
        }
        const errText = await ttsRes.text();
        req.log.warn({ status: ttsRes.status, err: errText.slice(0, 120) }, "OpenAI TTS failed, falling back to Edge TTS");
      } catch (e) {
        req.log.warn({ err: e }, "OpenAI TTS error, falling back to Edge TTS");
      }
    }

    // Edge TTS — free Microsoft neural voices, no API key required
    try {
      const audioBuffer = await synthesiseWithEdgeTTS(text.slice(0, 4000), safeVoice);
      const base64 = audioBuffer.toString("base64");
      req.log.info({ voice: safeVoice, engine: "edge-tts", bytes: audioBuffer.length }, "TTS success");
      res.json({ audio: base64, contentType: "audio/mpeg" });
    } catch (edgeErr) {
      req.log.error({ err: edgeErr }, "Edge TTS also failed");
      res.status(502).json({ error: "TTS generation failed" });
    }
  } catch (err) {
    req.log.error({ err }, "TTS endpoint error");
    res.status(500).json({ error: "Internal Server Error" });
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
