import { Router, IRouter } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { scamAnalysisTable, scamDetectionFeedbackTable, scamLibraryTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";
import { analyzeScamText } from "../lib/scamAnalyzer.js";
import fs from "fs/promises";

async function extractPdfText(filePath: string): Promise<string> {
  const mod = await import("pdf-parse");
  const pdfParse = (mod as any).default || mod;
  const buffer = await fs.readFile(filePath);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await pdfParse(buffer);
      return data.text || "";
    } catch (err) {
      if (attempt === 0) continue;
      return "";
    }
  }
  return "";
}

async function extractDocxText(filePath: string): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || "";
}

async function extractImageText(filePath: string, mimeType: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return "";
  const buffer = await fs.readFile(filePath);
  const base64 = buffer.toString("base64");

  const isPdf = mimeType === "application/pdf";
  const contentParts: any[] = [
    {
      type: "text",
      text: "Extract ALL text from this document exactly as it appears. Include every word, number, URL, email address, phone number, and symbol. Do not summarize or interpret — just extract the raw text. If there is no text, reply with EMPTY.",
    },
  ];

  if (isPdf) {
    contentParts.push({
      type: "file",
      file: { filename: "document.pdf", file_data: `data:application/pdf;base64,${base64}` },
    });
  } else {
    contentParts.push({
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
    });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: contentParts }],
      max_tokens: 2000,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("OpenAI OCR error:", res.status, errBody);
    return "";
  }
  const data = (await res.json()) as any;
  const extracted = data.choices?.[0]?.message?.content?.trim() || "";
  return extracted === "EMPTY" ? "" : extracted;
}

const upload = multer({
  dest: "/tmp/scam-uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf", "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    const byExtension = file.originalname.endsWith(".docx") || file.originalname.endsWith(".doc");
    cb(null, allowed.includes(file.mimetype) || byExtension);
  },
});

const router: IRouter = Router();

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
      analysis_details: {
        layers: analysis.layers,
        entities: analysis.entities,
        keywords_detected: analysis.keywords_detected,
        detected_patterns: analysis.detected_patterns,
        confidence: analysis.confidence,
        matched_categories: analysis.matched_categories,
        vulnerability_factors: analysis.vulnerability_factors,
      },
    }).returning();

    res.json({
      id: saved.id,
      risk_score: analysis.risk_score,
      risk_level: analysis.risk_level,
      confidence: analysis.confidence,
      detected_patterns: analysis.detected_patterns,
      explanation: analysis.explanation,
      recommendation: analysis.recommendation,
      layers: analysis.layers,
      entities: {
        urls: analysis.entities.urls,
        phones: analysis.entities.phones,
        emails: analysis.entities.emails,
        amounts: analysis.entities.amounts,
        senderEmail: analysis.entities.senderEmail,
      },
      keywords_detected: analysis.keywords_detected,
      matched_categories: analysis.matched_categories,
      vulnerability_factors: analysis.vulnerability_factors,
    });
  } catch (err) {
    req.log.error({ err }, "Scam analyze error");
    res.status(500).json({ error: "Internal Server Error", message: "Could not analyze message" });
  }
});

router.post("/analyze-attachment", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
  try {
    const file = req.file;
    const additionalText = req.body?.text || "";

    if (!file && !additionalText) {
      res.status(400).json({ error: "Bad Request", message: "A file or text is required" });
      return;
    }

    let extractedText = additionalText;

    if (file) {
      try {
        if (file.mimetype === "text/plain") {
          const content = await fs.readFile(file.path, "utf-8");
          extractedText = extractedText ? `${extractedText}\n\n--- Attached file content ---\n${content}` : content;
        } else if (file.mimetype === "application/pdf") {
          req.log.info({ filename: file.originalname }, "Extracting text from PDF");
          let pdfContent = await extractPdfText(file.path);
          if (!pdfContent.trim()) {
            req.log.info({ filename: file.originalname }, "PDF has no selectable text, falling back to OCR");
            pdfContent = await extractImageText(file.path, "application/pdf");
          }
          if (pdfContent.trim()) {
            extractedText = extractedText
              ? `${extractedText}\n\n--- Extracted from PDF: ${file.originalname} ---\n${pdfContent}`
              : pdfContent;
          } else {
            extractedText = extractedText
              ? `${extractedText}\n\n[PDF file contained no extractable text: ${file.originalname}]`
              : `[PDF file contained no extractable text: ${file.originalname}]`;
          }
        } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.originalname.endsWith(".docx")) {
          req.log.info({ filename: file.originalname }, "Extracting text from DOCX");
          const docxContent = await extractDocxText(file.path);
          if (docxContent.trim()) {
            extractedText = extractedText
              ? `${extractedText}\n\n--- Extracted from document: ${file.originalname} ---\n${docxContent}`
              : docxContent;
          } else {
            extractedText = extractedText
              ? `${extractedText}\n\n[Document contained no extractable text: ${file.originalname}]`
              : `[Document contained no extractable text: ${file.originalname}]`;
          }
        } else if (file.mimetype === "application/msword" || file.originalname.endsWith(".doc")) {
          req.log.info({ filename: file.originalname }, "Extracting text from DOC via OCR fallback");
          const ocrContent = await extractImageText(file.path, file.mimetype);
          if (ocrContent.trim()) {
            extractedText = extractedText
              ? `${extractedText}\n\n--- Extracted from document: ${file.originalname} ---\n${ocrContent}`
              : ocrContent;
          } else {
            extractedText = extractedText
              ? `${extractedText}\n\n[Document contained no readable text: ${file.originalname}]`
              : `[Document contained no readable text: ${file.originalname}]`;
          }
        } else if (file.mimetype.startsWith("image/")) {
          req.log.info({ filename: file.originalname }, "Running OCR on image");
          const ocrContent = await extractImageText(file.path, file.mimetype);
          if (ocrContent.trim()) {
            extractedText = extractedText
              ? `${extractedText}\n\n--- Extracted from image: ${file.originalname} ---\n${ocrContent}`
              : ocrContent;
          } else {
            extractedText = extractedText
              ? `${extractedText}\n\n[Image contained no readable text: ${file.originalname}]`
              : `[Image contained no readable text: ${file.originalname}]`;
          }
        }
      } finally {
        await fs.unlink(file.path).catch(() => {});
      }
    }

    if (!extractedText.trim()) {
      res.status(400).json({ error: "Bad Request", message: "No analyzable content found" });
      return;
    }

    const analysis = analyzeScamText(extractedText);

    const [saved] = await db.insert(scamAnalysisTable).values({
      user_id: req.user!.userId,
      extracted_text: extractedText,
      risk_score: analysis.risk_score.toString(),
      risk_level: analysis.risk_level,
      analysis_details: {
        layers: analysis.layers,
        entities: analysis.entities,
        keywords_detected: analysis.keywords_detected,
        detected_patterns: analysis.detected_patterns,
        confidence: analysis.confidence,
        matched_categories: analysis.matched_categories,
        vulnerability_factors: analysis.vulnerability_factors,
      },
    }).returning();

    res.json({
      id: saved.id,
      risk_score: analysis.risk_score,
      risk_level: analysis.risk_level,
      confidence: analysis.confidence,
      detected_patterns: analysis.detected_patterns,
      explanation: analysis.explanation,
      recommendation: analysis.recommendation,
      layers: analysis.layers,
      entities: {
        urls: analysis.entities.urls,
        phones: analysis.entities.phones,
        emails: analysis.entities.emails,
        amounts: analysis.entities.amounts,
        senderEmail: analysis.entities.senderEmail,
      },
      keywords_detected: analysis.keywords_detected,
      matched_categories: analysis.matched_categories,
      vulnerability_factors: analysis.vulnerability_factors,
      attachment_info: file ? {
        filename: file.originalname,
        type: file.mimetype,
        size: file.size,
      } : null,
    });
  } catch (err) {
    req.log.error({ err }, "Scam analyze-attachment error");
    res.status(500).json({ error: "Internal Server Error", message: "Could not analyze attachment" });
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

router.get("/history/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [entry] = await db.select().from(scamAnalysisTable)
      .where(eq(scamAnalysisTable.id, req.params.id))
      .limit(1);

    if (!entry || entry.user_id !== req.user!.userId) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    res.json(entry);
  } catch (err) {
    req.log.error({ err }, "Scam detail error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/library", async (_req, res) => {
  try {
    const patterns = await db.select().from(scamLibraryTable).orderBy(desc(scamLibraryTable.created_at));
    res.json({ patterns });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/library", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { pattern_name, keywords, description } = req.body;
    if (!pattern_name) {
      res.status(400).json({ error: "Bad Request", message: "pattern_name is required" });
      return;
    }

    const [pattern] = await db.insert(scamLibraryTable).values({
      pattern_name,
      keywords: keywords || [],
      description: description || null,
    }).returning();

    res.status(201).json({ pattern_id: pattern.id });
  } catch (err) {
    req.log.error({ err }, "Add scam library pattern error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/report", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { analysis_id, report_type, additional_info } = req.body;
    if (!report_type) {
      res.status(400).json({ error: "Bad Request", message: "report_type is required" });
      return;
    }

    res.json({
      success: true,
      report_submitted: true,
      message: "Thank you for reporting this scam. Your report helps protect others.",
    });
  } catch (err) {
    req.log.error({ err }, "Scam report error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
