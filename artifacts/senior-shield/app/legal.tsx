import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { usePreferences } from "@/context/PreferencesContext";

const CONTACT_EMAIL = "admin@finnygator.com";

const PAGES: Record<string, { title: string; icon: any; content: string[] }> = {
  privacy: {
    title: "Privacy Policy",
    icon: "lock-closed",
    content: [
      "Effective Date: January 1, 2025",
      "SeniorShield (\u201cwe\u201d, \u201cour\u201d, \u201cus\u201d) is committed to protecting the privacy of our users, particularly seniors aged 65 and older. This Privacy Policy explains how we collect, use, store, and safeguard your personal information in compliance with applicable regulations including the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and the Americans with Disabilities Act (ADA).",
      "Information We Collect:",
      "Account information (name, email address) when you sign up.",
      "Device information (device type, operating system version) to provide accurate, device-specific technical assistance.",
      "Voice interactions and conversation history to deliver personalized help. Conversations are stored for up to 30 days and then permanently and automatically deleted.",
      "Messages you submit for scam detection analysis.",
      "Family member contact information (name, email, phone) that you voluntarily provide for safety alerts.",
      "Usage analytics to improve our services (only if you opt in).",
      "How We Use Your Information:",
      "To provide voice-guided technical assistance tailored to your specific device and operating system.",
      "To analyze messages for potential scams and protect you from fraud.",
      "To send family alerts when high-risk scams are detected (only with your explicit permission).",
      "To improve our AI assistant and scam detection accuracy.",
      "We never sell, rent, or trade your personal information to third parties under any circumstances.",
      "Data Encryption and Security:",
      "All data transmitted between your device and our servers is encrypted using TLS/SSL (Transport Layer Security). All stored personal data, including conversation history, account details, and scam analysis records, is encrypted at rest using AES-256 (Advanced Encryption Standard with 256-bit keys), which is the same standard used by banks and government agencies. Authentication tokens are securely hashed and stored using industry-standard cryptographic methods.",
      "Audit Logging:",
      "SeniorShield maintains comprehensive audit logs of all account activity, including logins, profile changes, data access, and security-related events. These logs are used to detect unauthorized access, investigate security incidents, and maintain the integrity of your account. Audit logs are retained for 90 days and are accessible only by authorized security personnel.",
      "Your Rights Under GDPR:",
      "If you are located in the European Economic Area (EEA), you have the right to: access your personal data at any time; request correction of inaccurate data; request deletion of your data (right to be forgotten); object to or restrict processing of your data; request data portability (receive your data in a machine-readable format); withdraw consent at any time. To exercise any of these rights, contact us at the email below. We will respond within 30 days.",
      "Your Rights Under CCPA:",
      "If you are a California resident, you have the right to: know what personal information we collect and how it is used; request deletion of your personal information; opt out of the sale of your personal information (we do not sell your data); not be discriminated against for exercising your privacy rights. You may submit a CCPA request by emailing us at the address below.",
      "ADA Accessibility Compliance:",
      "SeniorShield is designed with accessibility as a core principle. We comply with ADA guidelines by offering: adjustable text sizes (Normal, Large, Extra Large); high-contrast display mode for users with visual impairments; voice-first interaction so the app can be used without reading the screen; simple, jargon-free language throughout the interface; large, easy-to-tap touch targets for all interactive elements.",
      "Data Retention:",
      "Conversation history is automatically deleted after 30 days. Account data is retained while your account is active. When you delete your account, all associated data is permanently removed within 30 days. Audit logs are retained for 90 days for security purposes.",
      "Third-Party Services:",
      "SeniorShield uses the following third-party services: OpenAI for AI-powered voice assistance and scam detection; Stripe for secure payment processing (Pro plan); Resend for transactional emails (verification codes). These providers are contractually bound to protect your data and process it only as instructed by us.",
      "Children\u2019s Privacy:",
      "SeniorShield is not intended for children under 13. We do not knowingly collect data from children. If we learn that we have collected data from a child under 13, we will delete it promptly.",
      "Changes to This Policy:",
      "We may update this Privacy Policy from time to time. We will notify you of material changes through the app and via email. Continued use of SeniorShield after changes constitutes acceptance of the updated policy.",
      `For any privacy questions, data requests, or concerns, contact us at ${CONTACT_EMAIL}.`,
    ],
  },
  terms: {
    title: "Terms of Service",
    icon: "document-text",
    content: [
      "Effective Date: January 1, 2025",
      "Welcome to SeniorShield. By creating an account or using our app, you agree to be bound by these Terms of Service. Please read them carefully.",
      "About SeniorShield:",
      "SeniorShield is a voice-guided assistant designed to help seniors aged 65 and older with everyday technology tasks and to protect against scams. It is not a substitute for professional medical, legal, or financial advice.",
      "Your Account:",
      "You must provide accurate and complete information when creating your account. You are responsible for maintaining the confidentiality and security of your login credentials. You must notify us immediately if you suspect unauthorized access to your account. You must be at least 13 years old to use SeniorShield.",
      "Acceptable Use:",
      "Use SeniorShield only for its intended purpose of receiving technology help and scam protection. Do not attempt to misuse, reverse engineer, decompile, or interfere with our services. Do not use SeniorShield to transmit harmful, fraudulent, or illegal content. Do not attempt to access other users\u2019 accounts or data.",
      "Subscriptions and Billing:",
      "SeniorShield offers a free tier and a paid Pro plan. Pro subscriptions are billed monthly or annually through Stripe, our secure payment processor. All payment information is handled directly by Stripe and is never stored on our servers. You can cancel your subscription at any time from the Settings screen. Refunds are handled on a case-by-case basis \u2014 contact us at the email below.",
      "Intellectual Property:",
      "SeniorShield, including its name, logo, design, and content, is the property of SeniorShield and its licensors. You may not copy, modify, distribute, or create derivative works from any part of the app without our written consent.",
      "Data Security and Privacy:",
      "Your use of SeniorShield is also governed by our Privacy Policy. We use AES-256 encryption for stored data and TLS/SSL for all data in transit. We maintain audit logs of account activity to protect your security.",
      "Limitations and Disclaimers:",
      "SeniorShield provides general technology guidance and scam detection. We do not guarantee 100% accuracy in scam detection. We are not responsible for actions taken based on our AI assistant\u2019s guidance. The AI assistant will not provide medical, legal, or financial advice \u2014 always consult qualified professionals for those matters. SeniorShield is provided \u201cas is\u201d without warranties of any kind, express or implied.",
      "Limitation of Liability:",
      "To the maximum extent permitted by law, SeniorShield shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the app.",
      "Termination:",
      "We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior. You can delete your account at any time from Settings, which will permanently remove all your data.",
      "Governing Law:",
      "These terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law provisions.",
      "Changes to Terms:",
      "We may update these terms from time to time. We will notify you of significant changes through the app and via email. Your continued use after changes constitutes acceptance.",
      `Questions? Contact us at ${CONTACT_EMAIL}.`,
    ],
  },
  cookies: {
    title: "Cookie Policy",
    icon: "information-circle",
    content: [
      "Effective Date: January 1, 2025",
      "SeniorShield uses minimal cookies and local storage to provide you with a safe and personalized experience. This policy explains what data is stored on your device and why.",
      "What We Store on Your Device:",
      "Authentication tokens \u2014 securely stored on your device to keep you logged in between sessions. These tokens are cryptographically signed and expire after a set period for your security.",
      "User preferences \u2014 your chosen theme (light/dark mode), text size, voice settings, assistant name, and high-contrast preference are stored locally so they load instantly when you open the app.",
      "Session data \u2014 temporary data to maintain your conversation context during active use. This is cleared when you log out.",
      "What We Do Not Store on Your Device:",
      "We do not store your password on your device. We do not use third-party advertising cookies or tracking pixels. We do not use cookies to follow you across websites or apps. We do not store any sensitive personal information (like email or phone numbers) in cookies or local storage. We do not sell or share cookie data with any third party.",
      "Security of Stored Data:",
      "All locally stored authentication tokens use secure storage mechanisms provided by your device\u2019s operating system (Keychain on iOS, Keystore on Android). On the web, tokens are stored using secure, HTTP-only practices where possible.",
      "Managing Your Data:",
      "You can clear all locally stored data by logging out of the app from Settings. Deleting your account removes all server-side data and resets all locally stored preferences. You can also clear your app data through your device\u2019s settings (Settings > Apps > SeniorShield > Clear Data on Android, or delete and reinstall on iOS).",
      "GDPR and CCPA Compliance:",
      "Our use of cookies and local storage complies with GDPR and CCPA requirements. We only store data that is strictly necessary for the app to function. No consent banner is required because we do not use tracking or advertising cookies.",
      `For questions about our cookie and local storage practices, contact ${CONTACT_EMAIL}.`,
    ],
  },
  security: {
    title: "Security Checklist",
    icon: "shield-checkmark",
    content: [
      "Effective Date: January 1, 2025",
      "SeniorShield takes the security of your data seriously. Below is a comprehensive overview of the security measures we implement to protect your account and personal information.",
      "Encryption:",
      "All data in transit is protected with TLS 1.2+ / SSL encryption, ensuring that any information sent between your device and our servers cannot be intercepted or read by third parties.",
      "All data stored on our servers (at rest) is encrypted using AES-256 encryption, the gold standard used by banks, healthcare systems, and government agencies worldwide.",
      "Database credentials and API keys are encrypted and stored in secure environment vaults, never in application code.",
      "Authentication and Access Control:",
      "Passwords are hashed using bcrypt with salt rounds, meaning we never store your actual password \u2014 only a secure, irreversible hash.",
      "JSON Web Tokens (JWT) are used for session management with expiration times to prevent unauthorized access.",
      "Email verification is required for all new accounts to confirm identity.",
      "Google OAuth 2.0 is supported as a secure alternative login method.",
      "API endpoints are protected with authentication middleware that validates every request.",
      "Audit Logging:",
      "All account activity is logged, including: login attempts (successful and failed); profile changes; password updates; data access and modifications; security-related events.",
      "Audit logs are monitored for suspicious patterns such as unusual login locations, repeated failed attempts, or bulk data access.",
      "Logs are retained for 90 days and are accessible only to authorized security personnel.",
      "Network Security:",
      "All API endpoints use HTTPS exclusively \u2014 HTTP connections are automatically redirected to HTTPS.",
      "Cross-Origin Resource Sharing (CORS) is configured to accept requests only from authorized domains.",
      "Rate limiting is applied to prevent brute-force attacks on login and API endpoints.",
      "Input validation and sanitization is applied to all user inputs to prevent SQL injection and cross-site scripting (XSS) attacks.",
      "Data Protection:",
      "Conversation history is automatically and permanently deleted after 30 days.",
      "Account deletion from Settings permanently removes all associated data from our servers within 30 days.",
      "Scam analysis data is processed in real-time and not retained beyond the conversation session.",
      "Family member contact information is encrypted and only used for the specific purpose of sending safety alerts.",
      "Third-Party Security:",
      "OpenAI (AI processing) \u2014 data is sent over encrypted connections and is not used to train models. OpenAI\u2019s data processing agreement governs how your data is handled.",
      "Stripe (payments) \u2014 PCI DSS Level 1 certified, the highest level of payment security certification. We never store credit card numbers on our servers.",
      "Resend (email) \u2014 used only for transactional emails like verification codes. No marketing emails are sent without consent.",
      "Compliance:",
      "GDPR (General Data Protection Regulation) \u2014 we comply with all GDPR requirements for users in the European Economic Area, including data access, deletion, portability, and consent management.",
      "CCPA (California Consumer Privacy Act) \u2014 we comply with CCPA requirements for California residents, including the right to know, delete, and opt out.",
      "ADA (Americans with Disabilities Act) \u2014 the app is designed with accessibility at its core, including adjustable text sizes, high-contrast mode, voice-first interaction, and large touch targets.",
      "SOC 2 practices \u2014 we follow SOC 2 principles for security, availability, and confidentiality in our infrastructure and operations.",
      "Incident Response:",
      "We maintain an incident response plan that includes: immediate containment of any security breach; notification to affected users within 72 hours (as required by GDPR); investigation and root cause analysis; remediation and preventive measures.",
      "Responsible Disclosure:",
      "If you discover a security vulnerability in SeniorShield, please report it responsibly by emailing us. We take all reports seriously and will respond promptly. We will not take legal action against researchers who report vulnerabilities in good faith.",
      `Report security concerns or request more information at ${CONTACT_EMAIL}.`,
    ],
  },
  contact: {
    title: "Contact Us",
    icon: "mail",
    content: [
      "We would love to hear from you! Whether you have questions, feedback, or need assistance, our team is here to help.",
      "Email:",
      `${CONTACT_EMAIL}`,
      "We aim to respond to all inquiries within 24\u201348 business hours.",
      "What to Include:",
      "Your name and the email associated with your SeniorShield account.",
      "A clear description of your question, issue, or feedback.",
      "Screenshots if relevant (for technical issues).",
      "Common Reasons to Contact Us:",
      "Account issues (login problems, password reset).",
      "Billing questions (subscription, charges, refunds).",
      "Bug reports or app issues.",
      "Feature suggestions.",
      "Privacy or data requests (GDPR, CCPA).",
      "Security vulnerability reports.",
      "Accessibility concerns or suggestions.",
      "General feedback or questions.",
      "For emergencies, please call 911 or use the Emergency button in the app. Our team cannot provide real-time emergency assistance via email.",
    ],
  },
};

export default function LegalScreen() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const { theme } = useTheme();
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();
  const data = PAGES[page || "privacy"];

  if (!data) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 52 : 0) + 12, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Ionicons name={data.icon} size={22} color="#2563EB" />
        <Text style={[styles.headerTitle, { color: theme.text, fontSize: ts.md }]}>{data.title}</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {data.content.map((paragraph, i) => {
          const isHeading = paragraph.endsWith(":");
          const isEmail = paragraph === CONTACT_EMAIL;
          return (
            <Text
              key={i}
              style={[
                isHeading ? styles.heading : isEmail ? styles.emailLink : styles.paragraph,
                {
                  color: isEmail ? "#2563EB" : isHeading ? theme.text : theme.textSecondary,
                  fontSize: isHeading ? ts.base : ts.sm,
                },
              ]}
              onPress={isEmail ? () => Linking.openURL(`mailto:${CONTACT_EMAIL}`) : undefined}
            >
              {paragraph}
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: { marginRight: 4 },
  headerTitle: { fontFamily: "Inter_700Bold", flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  heading: { fontFamily: "Inter_700Bold", marginTop: 8 },
  paragraph: { fontFamily: "Inter_400Regular", lineHeight: 22 },
  emailLink: { fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
});
