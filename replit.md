# SeniorShield

## Overview

SeniorShield is a full-stack mobile application designed for seniors (65+) to enhance their digital safety and provide accessible tech support. The application offers several key features: voice-guided technical assistance, scam message detection with a risk scoring system, and a family alert system for high-risk scam detections. It also includes an emergency screen for quick access to 911 and family SOS, a structured onboarding process, and subscription billing for premium features. The project aims to empower seniors with technology while ensuring their safety and connecting them with their family support network.

## User Preferences

I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `lib/api-spec`.
Do not make changes to the file `artifacts/senior-shield/app/emergency.tsx`.

## System Architecture

The project is built as a pnpm monorepo, utilizing Node.js 24 and TypeScript 5.9.

**Mobile Application (SeniorShield)**:
- Developed with Expo (React Native) and Expo Router v6, targeting iOS and Airbnb-inspired design principles.
- UI/UX: Features a clean blue color scheme (`#2563EB`) and the Inter font.
- Core screens include authentication, onboarding, main tabs (home, scam check, reminders, family, history, settings), subscription management, and an emergency screen.
- Daily Reminders tab: Users can select up to 3 active reminders from 8 presets (medication, family call, morning walk, wellness check, hydration, meals, appointments, gratitude) or create custom ones. The AI assistant uses these to greet users daily. Toggles available per-reminder. Backend stores preferences in `daily_reminders` table (with jsonb `metadata` column for extra config) and responses in `daily_reminder_responses` table.
- Daily Quotes: The home screen displays an inspirational quote (left-justified, italicized, max 2 lines) above the voice orb before a conversation starts. When the user taps the orb or "Type instead", the quote animates off-screen (slides right with fade). Quotes rotate daily from a curated collection of 193 quotes in `constants/dailyQuotes.ts` (~6+ months before repeating). All quotes are kept under 65 characters to fit within 2 lines. No external API or AI dependency — fully self-contained. Users can disable this feature via a toggle in Settings. The preference is stored as `daily_quotes_enabled` in the users table.
- Authentication uses JWT tokens stored in `AsyncStorage` and managed via `AuthContext`. Global session expiry detection: `api.ts` emits `sessionExpired` on any 401 response; `AuthContext` listens and auto-clears auth state + shows user-facing alert.
- The application integrates a centralized API service (`services/api.ts`) for all backend communication, with a custom lightweight event system (`apiEvents`) for cross-cutting concerns like session expiry.

**Backend API (api-server)**:
- Built with Express 5, PostgreSQL, and Drizzle ORM.
- Employs Zod for validation of API requests and responses.
- API codegen is handled by Orval from an OpenAPI specification, generating React Query hooks and Zod schemas.
- Features comprehensive API endpoints for authentication, user management, voice assistance (AI queries, TTS), scam detection, family management (max 3 members per user), contact management, billing (Stripe integration), emergency services, hearing aid connectivity, administration, analytics, telecom, insurance, and facility management.
- **Family Scam Alerts**: When a scam scan returns medium risk or above, users can tap "Alert Family Members" to send a branded email alert to all family members with scam_alerts enabled. The email includes risk score, risk level, scam category, and safety recommendations. The `scam_analysis` record is marked `family_notified: true` only when at least one email is successfully sent.
- **Scam Detection Engine** (`src/lib/scamFramework.ts` + `src/lib/scamAnalyzer.ts`): Rebuilt with an exhaustive 76-category framework covering 12 sectors (government, financial, healthcare, technology, retail, relationship, insurance, real estate, employment, education, utility, miscellaneous). Features 600+ keywords with word-boundary matching for short tokens, 250+ red flags, category-specific minimum trigger scores (40–75 pts), and 16 senior vulnerability multipliers (1.2x–1.5x) targeting authority exploitation, emotional manipulation, urgency pressure, isolation tactics, tech unfamiliarity, romance exploitation, etc. The 5-layer analysis pipeline: (1) Industry Category Detection (max 40pts, per-cat cap 30), (2) Cross-Cutting Pattern Analysis with compound pattern detection (max 30pts), (3) Link Analysis with typosquatting detection (max 20pts), (4) Sender Analysis with domain verification (max 15pts), (5) Senior Vulnerability Analysis with score multipliers (max 15pts). Post-layer adjustments: compound pattern multipliers (up to 2.5x for romance/grandparent scams) and legitimate message score reduction (up to -50pts for verified senders with informational content). Enhanced categories: Romance (emotional/military/isolation keywords, trigger 40), Grandparent (secrecy/financial keywords, trigger 45), Funeral (burial/release/fee keywords, trigger 40), Charity (matching donation/urgency keywords, trigger 40), Pet Adoption (rehome/shipping/deposit keywords, trigger 40). Legitimate service whitelist (50+ companies across banks, pharmacies, services, utilities, healthcare) with score reduction when no suspicious patterns detected. 10 compound scam patterns with risk bonuses and multipliers. API response includes `matched_categories`, `vulnerability_factors`, and optional `Legitimate Message Analysis` layer.
- Voice AI system prompt dynamically fetches the user's active daily reminders and injects them into the conversation context. Reminder labels are sanitized before prompt injection to prevent prompt injection attacks.
- Middleware includes rate limiting, standardized error handling, and 404 management.

**Database**:
- PostgreSQL is used as the primary database, managed by Drizzle ORM.
- The database schema is defined within the `lib/db` package.

**Monorepo Structure**:
- `artifacts/api-server`: Express API server.
- `artifacts/senior-shield`: Expo React Native mobile application.
- `lib/api-spec`: Contains the OpenAPI specification and Orval configuration.
- `lib/api-client-react`: Generated React Query hooks for API interaction.
- `lib/api-zod`: Generated Zod schemas for validation.
- `lib/db`: Drizzle ORM schema and database connection.

**TypeScript & Composite Projects**:
- The monorepo leverages TypeScript's composite projects feature for efficient type-checking and dependency management across packages.

## External Dependencies

- **OpenAI**: Used for GPT-4o-mini in voice assistance and text-to-speech (with Edge TTS as fallback).
- **Resend**: Transactional email service for verification, welcome, password reset, and scam alert emails to family members.
- **Stripe**: Full subscription billing with checkout, webhook signature verification, invoice retrieval, and cancellation via the official Stripe SDK.
- **PostgreSQL**: Relational database.
- **Expo**: Framework for React Native application development.
- **React Native**: Mobile application framework.
- **Orval**: API client and schema code generation from OpenAPI.
- **Zod**: Schema declaration and validation library.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **AsyncStorage**: For storing JWT tokens in the mobile application.
- **Google OAuth**: For Google sign-in functionality.
- **Stripe Webhook**: For receiving billing events from Stripe.
- **Telecom Carriers (e.g., Verizon, AT&T, T-Mobile)**: Integration for telecom-related features (OAuth, status, webhooks).
- **Medicare**: Integration for insurance-related features (OAuth, status, webhooks, plan listings).