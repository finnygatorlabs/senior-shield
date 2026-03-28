import {
  SCAM_CATEGORIES,
  SENIOR_VULNERABILITY_FACTORS,
  CROSS_CUTTING_KEYWORDS,
  KNOWN_COMPANIES,
  SUSPICIOUS_TLDS,
  URL_SHORTENERS,
  LEGITIMATE_SENDERS,
  LEGITIMATE_PATTERNS,
  SCAM_COMPOUND_PATTERNS,
  type ScamCategory,
  type VulnerabilityFactor,
} from "./scamFramework.js";

export interface ExtractedEntities {
  emails: string[];
  urls: string[];
  phones: string[];
  amounts: string[];
  senderEmail: string | null;
  senderDomain: string | null;
}

export interface LayerResult {
  name: string;
  score: number;
  maxScore: number;
  findings: string[];
}

interface CategoryMatch {
  category: ScamCategory;
  keywordHits: string[];
  redFlagHits: string[];
  rawScore: number;
}

interface VulnerabilityMatch {
  factor: VulnerabilityFactor;
  matchedPatterns: string[];
  multiplier: number;
}

export interface FullAnalysis {
  risk_score: number;
  risk_level: "safe" | "low_risk" | "medium_risk" | "high_risk" | "critical_risk";
  confidence: number;
  detected_patterns: string[];
  explanation: string;
  layers: LayerResult[];
  entities: ExtractedEntities;
  keywords_detected: string[];
  recommendation: string;
  matched_categories?: string[];
  vulnerability_factors?: string[];
}

export function extractEntities(text: string): ExtractedEntities {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
  const amountRegex = /\$[\d,]+(?:\.\d{2})?|\d+\s*(?:dollars?|usd)/gi;

  const emails = [...new Set((text.match(emailRegex) || []).map(e => e.toLowerCase()))];
  const urls = [...new Set(text.match(urlRegex) || [])];
  const phones = [...new Set(text.match(phoneRegex) || [])];
  const amounts = [...new Set(text.match(amountRegex) || [])];

  let senderEmail: string | null = null;
  let senderDomain: string | null = null;
  const fromMatch = text.match(/(?:from|sender|reply-to)\s*:?\s*<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i);
  if (fromMatch) {
    senderEmail = fromMatch[1].toLowerCase();
    senderDomain = senderEmail.split("@")[1];
  } else if (emails.length > 0) {
    senderEmail = emails[0];
    senderDomain = senderEmail.split("@")[1];
  }

  return { emails, urls, phones, amounts, senderEmail, senderDomain };
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalizeHomoglyphs(s: string): string {
  return s
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/5/g, "s")
    .replace(/\|/g, "l")
    .replace(/!/g, "i");
}

const SHORT_KEYWORD_THRESHOLD = 4;

function matchKeyword(lower: string, kw: string): boolean {
  if (kw.length <= SHORT_KEYWORD_THRESHOLD) {
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return regex.test(lower);
  }
  return lower.includes(kw);
}

function countKeywordGroup(lower: string, keywords: string[]): { hits: string[]; count: number } {
  const hits: string[] = [];
  for (const kw of keywords) {
    if (matchKeyword(lower, kw)) {
      hits.push(kw);
    }
  }
  return { hits, count: hits.length };
}

function layer1_categoryDetection(text: string): LayerResult & { matchedCategories: CategoryMatch[]; allKeywords: string[] } {
  const lower = text.toLowerCase();
  const findings: string[] = [];
  const allKeywords: string[] = [];
  const matchedCategories: CategoryMatch[] = [];
  let score = 0;

  for (const cat of SCAM_CATEGORIES) {
    const keywordHits: string[] = [];
    for (const kw of cat.keywords) {
      if (matchKeyword(lower, kw)) {
        keywordHits.push(kw);
      }
    }

    if (keywordHits.length === 0) continue;

    const redFlagHits: string[] = [];
    for (const rf of cat.redFlags) {
      const rfWords = rf.split(/\s+/).filter(w => w.length > 3);
      const matchCount = rfWords.filter(w => matchKeyword(lower, w)).length;
      if (matchCount >= Math.ceil(rfWords.length * 0.5)) {
        redFlagHits.push(rf);
      }
    }

    const keywordScore = Math.min(keywordHits.length * 4, 30);
    const redFlagScore = Math.min(redFlagHits.length * 6, 24);
    const rawScore = keywordScore + redFlagScore;

    const scaledThreshold = Math.round(cat.minimumTriggerScore * 0.2);
    if (rawScore >= scaledThreshold) {
      matchedCategories.push({ category: cat, keywordHits, redFlagHits, rawScore });
      allKeywords.push(...keywordHits);
    }
  }

  matchedCategories.sort((a, b) => b.rawScore - a.rawScore);

  const topCategories = matchedCategories.slice(0, 5);

  for (const match of topCategories) {
    const catScore = Math.min(match.rawScore, 30);
    score += catScore;

    if (match.redFlagHits.length > 0) {
      findings.push(
        `${match.category.name} (${match.category.sector}): ${match.keywordHits.length} keyword matches, ${match.redFlagHits.length} red flags detected`
      );
    } else {
      findings.push(
        `${match.category.name} (${match.category.sector}): ${match.keywordHits.length} related keywords detected`
      );
    }
  }

  return {
    name: "Industry Category Detection",
    score: Math.min(score, 40),
    maxScore: 40,
    findings,
    matchedCategories,
    allKeywords: [...new Set(allKeywords)],
  };
}

function layer2_crossCuttingPatterns(text: string): LayerResult & { patternNames: string[] } {
  const lower = text.toLowerCase();
  let score = 0;
  const findings: string[] = [];
  const patternNames: string[] = [];

  const urgency = countKeywordGroup(lower, CROSS_CUTTING_KEYWORDS.urgency);
  if (urgency.count >= 2) {
    score += Math.min(urgency.count * 3, 10);
    findings.push(`Urgency pressure language (${urgency.count} indicators): ${urgency.hits.slice(0, 4).join(", ")}`);
    patternNames.push("urgency_pressure");
  }

  const financial = countKeywordGroup(lower, CROSS_CUTTING_KEYWORDS.financial);
  if (financial.count >= 1) {
    score += Math.min(financial.count * 3, 9);
    findings.push(`Financial/payment language: ${financial.hits.slice(0, 4).join(", ")}`);
    patternNames.push("financial_language");
  }

  const threats = countKeywordGroup(lower, CROSS_CUTTING_KEYWORDS.threats);
  if (threats.count >= 1) {
    score += Math.min(threats.count * 4, 12);
    findings.push(`Threat language: ${threats.hits.slice(0, 4).join(", ")}`);
    patternNames.push("threat_language");
  }

  const personalInfo = countKeywordGroup(lower, CROSS_CUTTING_KEYWORDS.personalInfoRequest);
  if (personalInfo.count >= 1) {
    score += Math.min(personalInfo.count * 5, 15);
    findings.push(`Requests sensitive information: ${personalInfo.hits.slice(0, 4).join(", ")}`);
    patternNames.push("sensitive_info_request");
  }

  const impersonation = countKeywordGroup(lower, CROSS_CUTTING_KEYWORDS.impersonation);
  if (impersonation.count >= 1) {
    score += Math.min(impersonation.count * 4, 8);
    findings.push(`Impersonation language: ${impersonation.hits.slice(0, 3).join(", ")}`);
    patternNames.push("authority_impersonation");
  }

  const giftCard = countKeywordGroup(lower, CROSS_CUTTING_KEYWORDS.giftCardPayment);
  if (giftCard.count >= 1) {
    score += Math.min(giftCard.count * 6, 12);
    findings.push(`Gift card payment request — legitimate organizations never request gift card payments: ${giftCard.hits.slice(0, 3).join(", ")}`);
    patternNames.push("gift_card_payment");
  }

  const secrecy = countKeywordGroup(lower, CROSS_CUTTING_KEYWORDS.secrecy);
  if (secrecy.count >= 1) {
    score += Math.min(secrecy.count * 8, 16);
    findings.push(`Secrecy/isolation pressure — a major red flag: ${secrecy.hits.slice(0, 3).join(", ")}`);
    patternNames.push("secrecy_pressure");
  }

  const phishingPhrases = [
    "verify your account", "confirm your identity", "update your information",
    "confirm your account", "verify your identity", "restore access",
    "reactivate your account", "unlock your account", "secure your account",
  ];
  if (phishingPhrases.some(p => lower.includes(p))) {
    score += 10;
    findings.push("Phishing pattern: requests account verification or identity confirmation");
    patternNames.push("phishing");
  }

  if (urgency.count >= 2 && financial.count >= 1 && threats.count >= 1) {
    score += 8;
    findings.push("Compound threat pattern: urgency + financial request + threats combined — classic scam tactic");
    patternNames.push("compound_threat");
  }

  if (urgency.count >= 1 && personalInfo.count >= 1) {
    score += 5;
    findings.push("Time-pressured information request: urgency combined with request for sensitive data");
    patternNames.push("pressured_info_request");
  }

  for (const cp of SCAM_COMPOUND_PATTERNS) {
    const allGroupsMatch = cp.requiredGroups.every(group =>
      group.some(kw => matchKeyword(lower, kw))
    );
    if (allGroupsMatch) {
      score += cp.riskBonus;
      findings.push(`Compound pattern: ${cp.name} — ${cp.description}`);
      patternNames.push(`compound_${cp.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`);
    }
  }

  return { name: "Cross-Cutting Pattern Analysis", score: Math.min(score, 30), maxScore: 30, findings, patternNames };
}

function layer3_links(urls: string[], entities: ExtractedEntities): LayerResult {
  let score = 0;
  const findings: string[] = [];

  for (const url of urls) {
    let hostname = "";
    try { hostname = new URL(url).hostname.toLowerCase(); } catch { hostname = url.toLowerCase(); }

    if (URL_SHORTENERS.some(s => hostname.includes(s))) {
      score += 8;
      findings.push(`Shortened URL detected: ${url.substring(0, 60)}`);
    }

    if (SUSPICIOUS_TLDS.some(tld => hostname.endsWith(tld))) {
      score += 10;
      findings.push(`Suspicious domain extension: ${hostname}`);
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname)) {
      score += 15;
      findings.push(`URL uses IP address instead of domain name: suspicious`);
    }

    const subdomains = hostname.split(".");
    if (subdomains.length > 3) {
      score += 10;
      findings.push(`Unusually many subdomains in URL: ${hostname}`);
    }

    if (url.includes("@")) {
      score += 15;
      findings.push(`URL contains @ symbol — may redirect to a different site`);
    }

    if (/%[0-9A-Fa-f]{2}/.test(url) && (url.includes("%2F") || url.includes("%3D") || url.includes("%3F"))) {
      score += 8;
      findings.push(`URL contains encoded characters — may be hiding the real destination`);
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:") {
        score += 5;
        findings.push(`URL uses HTTP instead of HTTPS — connection is not secure`);
      }
    } catch {}

    for (const company of KNOWN_COMPANIES) {
      const companyInUrl = hostname.includes(company.name.replace(/\s/g, ""));
      const isLegit = company.domains.some(d => hostname === d || hostname.endsWith("." + d));
      if (companyInUrl && !isLegit) {
        score += 15;
        findings.push(`Domain spoofing: URL mentions "${company.name}" but is not from their official domain`);
        break;
      }

      for (const domain of company.domains) {
        const baseDomain = domain.split(".")[0];
        const hostBase = hostname.split(".").slice(-2, -1)[0] || "";
        const normalized = normalizeHomoglyphs(hostBase);
        const dist = levenshtein(normalized, baseDomain);
        if (dist > 0 && dist <= 2 && !isLegit) {
          score += 12;
          findings.push(`Typosquatting detected: "${hostname}" looks similar to "${domain}" (possible impersonation)`);
          break;
        }
      }
    }
  }

  return { name: "Link Analysis", score: Math.min(score, 20), maxScore: 20, findings };
}

function layer4_sender(entities: ExtractedEntities, text: string): LayerResult {
  const lower = text.toLowerCase();
  let score = 0;
  const findings: string[] = [];

  if (entities.senderDomain) {
    for (const company of KNOWN_COMPANIES) {
      const mentionsCompany = lower.includes(company.name);
      const isLegitDomain = company.domains.some(d => entities.senderDomain === d || entities.senderDomain!.endsWith("." + d));

      if (mentionsCompany && !isLegitDomain) {
        score += 15;
        findings.push(`Sender domain "${entities.senderDomain}" does not match ${company.name}'s official domain (${company.domains[0]})`);
        break;
      }

      if (entities.senderDomain) {
        const senderBase = entities.senderDomain.split(".").slice(-2, -1)[0] || "";
        const normalized = normalizeHomoglyphs(senderBase);
        for (const d of company.domains) {
          const dBase = d.split(".")[0];
          const dist = levenshtein(normalized, dBase);
          if (dist > 0 && dist <= 2 && !isLegitDomain) {
            score += 12;
            findings.push(`Sender domain "${entities.senderDomain}" looks suspiciously similar to "${d}" — possible spoofing`);
            break;
          }
        }
      }
    }
  } else {
    const claimsCompany = KNOWN_COMPANIES.some(c => lower.includes(c.name));
    if (claimsCompany) {
      score += 5;
      findings.push("Message references a known company but no verifiable sender information found");
    }
  }

  if (entities.phones.length > 0 && (lower.includes("call") || lower.includes("dial") || lower.includes("reach us"))) {
    const hasUrgency = CROSS_CUTTING_KEYWORDS.urgency.some(k => lower.includes(k));
    if (hasUrgency) {
      score += 5;
      findings.push("Urges you to call a phone number with urgency — legitimate companies rarely do this");
    }
  }

  return { name: "Sender Analysis", score: Math.min(score, 15), maxScore: 15, findings };
}

function layer5_seniorVulnerability(
  text: string,
  matchedCategories: CategoryMatch[],
  l1Score: number,
  l2Score: number,
): LayerResult & { vulnerabilityMatches: VulnerabilityMatch[]; multiplier: number } {
  const lower = text.toLowerCase();
  let score = 0;
  const findings: string[] = [];
  const vulnerabilityMatches: VulnerabilityMatch[] = [];

  for (const factor of SENIOR_VULNERABILITY_FACTORS) {
    const matchedPatterns: string[] = [];
    for (const pattern of factor.triggerPatterns) {
      if (matchKeyword(lower, pattern)) {
        matchedPatterns.push(pattern);
      }
    }

    if (matchedPatterns.length >= 2) {
      vulnerabilityMatches.push({
        factor,
        matchedPatterns,
        multiplier: factor.multiplier,
      });
      score += Math.min(matchedPatterns.length * 2, 6);
      findings.push(`Senior vulnerability: ${factor.name} — ${factor.description}`);
    }
  }

  if (l1Score >= 15 && l2Score >= 10) {
    score += 3;
    findings.push("Multiple threat categories detected simultaneously — a strong scam indicator");
  }

  const allCapsWords = (text.match(/\b[A-Z]{4,}\b/g) || []).length;
  if (allCapsWords >= 3) {
    score += 2;
    findings.push("Excessive use of ALL CAPS — a common pressure tactic in scams");
  }

  const topMultiplier = vulnerabilityMatches.length > 0
    ? Math.max(...vulnerabilityMatches.map(v => v.multiplier))
    : 1.0;

  return {
    name: "Senior Vulnerability Analysis",
    score: Math.min(score, 15),
    maxScore: 15,
    findings,
    vulnerabilityMatches,
    multiplier: topMultiplier,
  };
}

function checkLegitimateMessage(text: string, entities: ExtractedEntities): { reduction: number; findings: string[]; isSecurityNotification: boolean } {
  const lower = text.toLowerCase();
  let reduction = 0;
  const findings: string[] = [];

  const allLegitSenders = Object.values(LEGITIMATE_SENDERS).flat();
  const mentionedSender = allLegitSenders.find(s => lower.includes(s));

  const hasGiftCard = CROSS_CUTTING_KEYWORDS.giftCardPayment.some(k => lower.includes(k));
  const hasSecrecy = CROSS_CUTTING_KEYWORDS.secrecy.some(k => lower.includes(k));

  const protectivePhrases = [
    "never share your password", "never ask for your", "will never ask",
    "do not share your", "don't share your", "protect your password",
    "never give your", "never provide your", "never ask you for your password",
    "never request your", "we will never",
  ];
  const hasProtectiveLanguage = protectivePhrases.some(p => lower.includes(p));

  const scamOnlyBlockers = ["gift card", "send money", "western union", "bitcoin",
    "don't tell anyone", "keep this secret", "don't tell your family"];
  const contextSensitiveBlockers = ["wire transfer", "social security number", "ssn", "password", "pin number"];

  const hasScamOnlyBlocker = scamOnlyBlockers.some(k => lower.includes(k));
  const hasContextBlocker = !hasProtectiveLanguage && contextSensitiveBlockers.some(k => lower.includes(k));
  const hasHardBlocker = hasScamOnlyBlocker || hasContextBlocker;

  const hasUrgentFinancialRequest = CROSS_CUTTING_KEYWORDS.urgency.some(k => lower.includes(k)) &&
    CROSS_CUTTING_KEYWORDS.financial.some(k => lower.includes(k));
  const hasPersonalInfoRequest = CROSS_CUTTING_KEYWORDS.personalInfoRequest.some(k => lower.includes(k));
  const hasThreats = CROSS_CUTTING_KEYWORDS.threats.some(k => lower.includes(k));
  const hasImpersonation = CROSS_CUTTING_KEYWORDS.impersonation.some(k => lower.includes(k));

  const hasAnyHighRiskIndicator = hasUrgentFinancialRequest || hasPersonalInfoRequest || hasThreats || hasGiftCard || hasImpersonation || hasSecrecy;

  const securityNotificationKeywords = [
    "security alert", "new device login", "new device", "unusual activity",
    "suspicious activity", "unauthorized access", "confirm login",
    "detected login", "sign-in from", "accessed from",
  ];
  const securityMatchCount = securityNotificationKeywords.filter(kw => lower.includes(kw)).length;
  const isSecurityNotification = securityMatchCount >= 1;

  const hasSuspiciousLinks = entities.urls.some(u => {
    try {
      const host = new URL(u).hostname.toLowerCase();
      return !KNOWN_COMPANIES.some(c => c.domains.some(d => host === d || host.endsWith("." + d)));
    } catch { return true; }
  });

  if (isSecurityNotification && mentionedSender && !hasHardBlocker && !hasSuspiciousLinks) {
    reduction += 40;
    findings.push(`Legitimate security notification from recognized sender "${mentionedSender}"`);

    if (entities.senderDomain) {
      const matchesSender = KNOWN_COMPANIES.some(c =>
        c.name === mentionedSender &&
        c.domains.some(d => entities.senderDomain === d || entities.senderDomain!.endsWith("." + d))
      );
      const isAnyOfficialDomain = !matchesSender && KNOWN_COMPANIES.some(c =>
        c.domains.some(d => entities.senderDomain === d || entities.senderDomain!.endsWith("." + d))
      );
      if (matchesSender) {
        reduction += 40;
        findings.push(`Official sender domain "${entities.senderDomain}" matches recognized sender "${mentionedSender}"`);
      } else if (isAnyOfficialDomain) {
        reduction += 25;
        findings.push(`Official sender domain "${entities.senderDomain}" verified`);
      }
    }

    return { reduction: Math.min(reduction, 80), findings, isSecurityNotification: true };
  }

  if (mentionedSender && !hasAnyHighRiskIndicator) {
    reduction += 25;
    findings.push(`Message from recognized sender "${mentionedSender}" with no suspicious requests`);
  }

  if (entities.senderDomain) {
    const isOfficialDomain = KNOWN_COMPANIES.some(c =>
      c.domains.some(d => entities.senderDomain === d || entities.senderDomain!.endsWith("." + d))
    );
    if (isOfficialDomain && !hasAnyHighRiskIndicator) {
      reduction += 30;
      findings.push(`Official sender domain "${entities.senderDomain}" verified`);
    }
  }

  for (const pattern of LEGITIMATE_PATTERNS) {
    const matchCount = pattern.keywords.filter(kw => lower.includes(kw)).length;
    if (matchCount >= 1 && !hasAnyHighRiskIndicator) {
      reduction += pattern.scoreReduction;
      findings.push(`${pattern.name}: ${pattern.description}`);
    }
  }

  return { reduction: Math.min(reduction, 60), findings, isSecurityNotification: false };
}

function getCompoundMultiplier(text: string): number {
  const lower = text.toLowerCase();
  let maxMultiplier = 1.0;

  for (const cp of SCAM_COMPOUND_PATTERNS) {
    const allGroupsMatch = cp.requiredGroups.every(group =>
      group.some(kw => matchKeyword(lower, kw))
    );
    if (allGroupsMatch && cp.multiplier > maxMultiplier) {
      maxMultiplier = cp.multiplier;
    }
  }

  return maxMultiplier;
}

export function analyzeScamText(text: string): FullAnalysis {
  const entities = extractEntities(text);

  const l1 = layer1_categoryDetection(text);
  const l2 = layer2_crossCuttingPatterns(text);
  const l3 = layer3_links(entities.urls, entities);
  const l4 = layer4_sender(entities, text);
  const l5 = layer5_seniorVulnerability(text, l1.matchedCategories, l1.score, l2.score);

  const compoundMultiplier = getCompoundMultiplier(text);
  const legitResult = checkLegitimateMessage(text, entities);

  const baseScore = l1.score + l2.score + l3.score + l4.score + l5.score;

  const effectiveMultiplier = Math.max(l5.multiplier, compoundMultiplier);

  let adjustedScore = baseScore;

  if (legitResult.reduction > 0 && legitResult.isSecurityNotification) {
    adjustedScore = Math.max(0, adjustedScore - legitResult.reduction);
  } else {
    if (effectiveMultiplier > 1.0 && baseScore >= 20) {
      adjustedScore = Math.round(baseScore * effectiveMultiplier);
    }
    adjustedScore = Math.max(0, adjustedScore - legitResult.reduction);
  }

  const riskScore = Math.min(adjustedScore, 100);

  let risk_level: FullAnalysis["risk_level"];
  if (riskScore <= 20) risk_level = "safe";
  else if (riskScore <= 40) risk_level = "low_risk";
  else if (riskScore <= 60) risk_level = "medium_risk";
  else if (riskScore <= 80) risk_level = "high_risk";
  else risk_level = "critical_risk";

  const totalFindings = l1.findings.length + l2.findings.length + l3.findings.length + l4.findings.length + l5.findings.length + legitResult.findings.length;
  const confidence = Math.min(
    0.5 +
    (riskScore / 200) +
    (l1.matchedCategories.length * 0.04) +
    (l2.patternNames.length * 0.03) +
    (l3.findings.length * 0.03) +
    (l5.vulnerabilityMatches.length * 0.02) +
    (totalFindings > 10 ? 0.05 : 0),
    0.99
  );

  const detected_patterns = [...new Set([
    ...l1.matchedCategories.map(m => m.category.name.toLowerCase().replace(/[\s\/]+/g, "_")),
    ...l2.patternNames,
    ...(l3.findings.length > 0 ? ["suspicious_links"] : []),
    ...(l4.findings.length > 0 ? ["sender_spoofing"] : []),
    ...(l5.vulnerabilityMatches.length > 0 ? ["senior_vulnerability_targeted"] : []),
    ...(legitResult.reduction > 0 ? ["legitimate_message_indicators"] : []),
  ])];

  const matched_categories = l1.matchedCategories.map(m => m.category.name);
  const vulnerability_factors = l5.vulnerabilityMatches.map(v => v.factor.name);

  const layers: LayerResult[] = [
    { name: l1.name, score: l1.score, maxScore: l1.maxScore, findings: l1.findings },
    { name: l2.name, score: l2.score, maxScore: l2.maxScore, findings: l2.findings },
    { name: l3.name, score: l3.score, maxScore: l3.maxScore, findings: l3.findings },
    { name: l4.name, score: l4.score, maxScore: l4.maxScore, findings: l4.findings },
    { name: l5.name, score: l5.score, maxScore: l5.maxScore, findings: l5.findings },
    ...(legitResult.reduction > 0 ? [{
      name: "Legitimate Message Analysis",
      score: -legitResult.reduction,
      maxScore: 0,
      findings: legitResult.findings,
    }] : []),
  ];

  const topCategory = l1.matchedCategories[0];
  const categoryLabel = topCategory ? ` This matches the pattern of ${topCategory.category.name}.` : "";
  const vulnerabilityLabel = l5.vulnerabilityMatches.length > 0
    ? ` This message specifically targets senior vulnerability factors: ${vulnerability_factors.join(", ")}.`
    : "";

  let explanation: string;
  let recommendation: string;

  if (risk_level === "safe") {
    explanation = `This message appears safe. No significant scam indicators were detected across any of our ${SCAM_CATEGORIES.length} scam categories. Always stay cautious and never share personal information with someone who contacts you unexpectedly.`;
    recommendation = "This looks safe, but always be cautious with unexpected messages.";
  } else if (risk_level === "low_risk") {
    const details = layers.flatMap(l => l.findings).slice(0, 2).join(". Also, ");
    explanation = `This message has a few minor warning signs: ${details}. It might be legitimate, but proceed with caution. If you are unsure, ask a family member to look at it before responding.`;
    recommendation = "Probably safe, but worth having a family member take a second look.";
  } else if (risk_level === "medium_risk") {
    const details = layers.flatMap(l => l.findings).slice(0, 3).join(". Additionally, ");
    explanation = `This message has several suspicious characteristics: ${details}.${categoryLabel} Do not click any links or provide personal information until you can verify who actually sent this message. Contact the company directly using a phone number you already have, not the one in the message.`;
    recommendation = "Be very cautious. Do not respond or click any links until verified.";
  } else if (risk_level === "high_risk") {
    const details = layers.flatMap(l => l.findings).slice(0, 4).join(". Furthermore, ");
    explanation = `WARNING: This message shows multiple high-risk scam indicators. ${details}.${categoryLabel}${vulnerabilityLabel} Do NOT click any links, call any numbers in the message, or provide any personal or financial information. This is very likely a scam attempt.`;
    recommendation = "Do NOT respond, click links, or share any information. This is very likely a scam.";
  } else {
    const details = layers.flatMap(l => l.findings).slice(0, 5).join(". ");
    explanation = `CRITICAL WARNING: This message is almost certainly a scam. ${details}.${categoryLabel}${vulnerabilityLabel} Do NOT interact with this message in any way. Do not click links, call numbers, send money, or share any information. Delete this message immediately. Your family has been notified.`;
    recommendation = "This is almost certainly a scam. Delete this message immediately. Your family has been notified.";
  }

  return {
    risk_score: riskScore,
    risk_level,
    confidence: Math.round(confidence * 100) / 100,
    detected_patterns,
    explanation,
    layers,
    entities,
    keywords_detected: l1.allKeywords,
    recommendation,
    matched_categories,
    vulnerability_factors,
  };
}
