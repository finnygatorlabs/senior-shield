import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { scamAnalysisTable, scamDetectionFeedbackTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

interface ScamAnalysisDetails {
  phishing_detected: boolean;
  urgency_detected: boolean;
  money_request_detected: boolean;
  personal_info_request_detected: boolean;
  suspicious_links_detected: boolean;
  bank_impersonation_detected: boolean;
}

function analyzeScamText(text: string): {
  risk_score: number;
  risk_level: "safe" | "suspicious" | "high_risk";
  detected_patterns: string[];
  analysis_details: ScamAnalysisDetails;
  explanation: string;
} {
  const lower = text.toLowerCase();
  let riskScore = 0;
  const detectedPatterns: string[] = [];

  const phishingKeywords = ["verify", "confirm", "urgent", "click here", "update", "account", "suspended", "locked"];
  const urgencyKeywords = ["immediately", "urgent", "act now", "limited time", "expires", "24 hours", "right away", "asap"];
  const moneyKeywords = ["payment", "wire", "gift card", "money", "cash", "bitcoin", "cryptocurrency", "transfer", "send $"];
  const personalInfoKeywords = ["ssn", "social security", "password", "pin", "credit card", "bank account", "routing number"];
  const bankNames = ["bank", "paypal", "amazon", "apple", "microsoft", "google", "irs", "medicare", "social security"];

  const phishing = phishingKeywords.some(k => lower.includes(k));
  const urgency = urgencyKeywords.some(k => lower.includes(k));
  const money = moneyKeywords.some(k => lower.includes(k));
  const personalInfo = personalInfoKeywords.some(k => lower.includes(k));
  const bank = bankNames.some(k => lower.includes(k));

  if (phishing) { riskScore += 30; detectedPatterns.push("phishing_keywords"); }
  if (urgency) { riskScore += 20; detectedPatterns.push("urgency"); }
  if (money) { riskScore += 25; detectedPatterns.push("money_request"); }
  if (personalInfo) { riskScore += 30; detectedPatterns.push("personal_info_request"); }
  if (bank) { riskScore += 15; detectedPatterns.push("bank_impersonation"); }

  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlPattern) || [];
  const suspiciousLinks = urls.some(url =>
    url.includes("bit.ly") || url.includes("tinyurl") || url.includes("short.link") ||
    url.includes("click") || url.includes("track")
  );
  if (suspiciousLinks) { riskScore += 15; detectedPatterns.push("suspicious_links"); }

  const capped = Math.min(riskScore, 100);
  let risk_level: "safe" | "suspicious" | "high_risk" = "safe";
  if (capped >= 70) risk_level = "high_risk";
  else if (capped >= 35) risk_level = "suspicious";

  const explanations: string[] = [];
  if (phishing) explanations.push("contains words often used in phishing attempts");
  if (urgency) explanations.push("creates artificial urgency to pressure you");
  if (money) explanations.push("asks for money or financial information");
  if (personalInfo) explanations.push("requests sensitive personal information");
  if (bank) explanations.push("may be impersonating a known company or organization");
  if (suspiciousLinks) explanations.push("contains suspicious shortened links");

  let explanation: string;
  if (risk_level === "safe") {
    explanation = "This message appears safe. No major scam indicators were detected. Always stay cautious and never share personal information unless you initiated the contact.";
  } else if (risk_level === "suspicious") {
    explanation = `This message has some suspicious characteristics: it ${explanations.join(", ")}. Be cautious before responding or clicking any links. Consider asking a family member to review it.`;
  } else {
    explanation = `WARNING: This message shows multiple high-risk scam indicators — it ${explanations.join(", ")}. Do NOT click any links, call back any numbers, or provide any information. This is very likely a scam attempt.`;
  }

  return {
    risk_score: capped,
    risk_level,
    detected_patterns: detectedPatterns,
    analysis_details: {
      phishing_detected: phishing,
      urgency_detected: urgency,
      money_request_detected: money,
      personal_info_request_detected: personalInfo,
      suspicious_links_detected: suspiciousLinks,
      bank_impersonation_detected: bank,
    },
    explanation,
  };
}

router.post("/analyze", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: "Bad Request", message: "text is required" });
      return;
    }

    const analysis = analyzeScamText(text);

    const [saved] = await db.insert(scamAnalysisTable).values({
      user_id: req.user!.userId,
      extracted_text: text,
      risk_score: analysis.risk_score.toString(),
      risk_level: analysis.risk_level,
      analysis_details: analysis.analysis_details,
    }).returning();

    res.json({
      id: saved.id,
      risk_score: analysis.risk_score,
      risk_level: analysis.risk_level,
      detected_patterns: analysis.detected_patterns,
      explanation: analysis.explanation,
      analysis_details: analysis.analysis_details,
    });
  } catch (err) {
    req.log.error({ err }, "Scam analyze error");
    res.status(500).json({ error: "Internal Server Error", message: "Could not analyze message" });
  }
});

router.get("/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const history = await db
      .select()
      .from(scamAnalysisTable)
      .where(eq(scamAnalysisTable.user_id, req.user!.userId))
      .orderBy(desc(scamAnalysisTable.created_at))
      .limit(20);

    res.json({
      history: history.map(h => ({
        id: h.id,
        extracted_text: h.extracted_text,
        risk_score: h.risk_score,
        risk_level: h.risk_level,
        user_feedback: h.user_feedback,
        created_at: h.created_at,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Scam history error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/feedback", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scam_analysis_id, feedback_type, explanation } = req.body;
    if (!scam_analysis_id || !feedback_type) {
      res.status(400).json({ error: "Bad Request", message: "scam_analysis_id and feedback_type are required" });
      return;
    }

    await db.insert(scamDetectionFeedbackTable).values({
      user_id: req.user!.userId,
      scam_analysis_id,
      feedback_type,
      explanation,
    });

    await db
      .update(scamAnalysisTable)
      .set({ user_feedback: feedback_type })
      .where(eq(scamAnalysisTable.id, scam_analysis_id));

    res.json({ success: true, message: "Feedback recorded. Thank you for helping improve scam detection!" });
  } catch (err) {
    req.log.error({ err }, "Scam feedback error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
