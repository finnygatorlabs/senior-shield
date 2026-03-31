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
- Premium Soft-Gate System: Free-tier users get limited access to premium features. Scam Analyzer allows 3 free scans (usage tracked in `feature_usage` DB table via API endpoints GET/POST `/api/user/feature-usage`). Family members limited to 1 free (premium allows up to 5). Usage is incremented only after successful operations (not on failure). PremiumGate modal component (`components/PremiumGate.tsx`) shows upgrade messaging and navigates to subscription. Home screen shows a compact green "Unlock Premium Protection" banner (single line, above daily quote) for free users. Tab bar shows gold star badges on Scam Analyzer and Family tabs for free users. All screens default `isPremium = true` to avoid false-gating premium users before API response returns.
- Daily Quotes: The home screen displays an inspirational quote (left-justified, italicized, max 2 lines) above the voice orb before a conversation starts. When the user taps the orb or "Type instead", the quote animates off-screen (slides right with fade). Quotes rotate daily from a curated collection of 193 quotes in `constants/dailyQuotes.ts` (~6+ months before repeating). All quotes are kept under 65 characters to fit within 2 lines. No external API or AI dependency — fully self-contained. Users can disable this feature via a toggle in Settings. The preference is stored as `daily_quotes_enabled` in the users table.
- Authentication uses JWT tokens stored in `AsyncStorage` and managed via `AuthContext`. Global session expiry detection: `api.ts` emits `sessionExpired` on any 401 response; `AuthContext` listens and auto-clears auth state + shows user-facing alert. Social sign-in supports Google (`expo-auth-session`) and Apple (`expo-apple-authentication`, iOS only). Both login and signup screens use progressive disclosure: social buttons shown first (Google blue, Apple black, Email translucent), email/password form revealed on tap. `loginWithGoogle(token, userType?, provider?)` in AuthContext routes to `/auth/google` or `/auth/apple` based on provider parameter.
- The application integrates a centralized API service (`services/api.ts`) for all backend communication, with a custom lightweight event system (`apiEvents`) for cross-cutting concerns like session expiry.

**Backend API (api-server)**:
- Built with Express 5, PostgreSQL, and Drizzle ORM.
- Employs Zod for validation of API requests and responses.
- API codegen is handled by Orval from an OpenAPI specification, generating React Query hooks and Zod schemas.
- Features comprehensive API endpoints for authentication, user management, voice assistance (AI queries, TTS), scam detection, family management (free=1, premium=5 members; enforced server-side via `userTiersTable` tier check), contact management, billing (Stripe integration), emergency services, hearing aid connectivity, administration, analytics, telecom, insurance, and facility management.
- **Family Member Invitation Email**: When a senior adds a family member via the app (onboarding or family tab), a branded notification email is sent to the family member's email address. The email explains what SeniorShield is, why they were selected as a trusted contact, and what notifications they can expect (scam alerts, emergency SOS, weekly summaries). Email is only sent on first add (duplicate adds are detected via `onConflictDoNothing().returning()` and skip the email). Email failures are non-fatal — the member is still added successfully. Uses Resend via `sendFamilyMemberNotificationEmail()` in `src/lib/email.ts`.
- **Family Scam Alerts**: When a scam scan returns medium risk or above, users can tap "Alert Family Members" to send a branded email alert to all family members with scam_alerts enabled. The email includes risk score, risk level, scam category, and safety recommendations. The `scam_analysis` record is marked `family_notified: true` only when at least one email is successfully sent.
- **Scam Detection Engine** (`src/lib/scamFramework.ts` + `src/lib/scamAnalyzer.ts`): Rebuilt with an exhaustive 76-category framework covering 12 sectors (government, financial, healthcare, technology, retail, relationship, insurance, real estate, employment, education, utility, miscellaneous). Features 600+ keywords with word-boundary matching for short tokens, 250+ red flags, category-specific minimum trigger scores (40–75 pts), and 16 senior vulnerability multipliers (1.2x–1.5x) targeting authority exploitation, emotional manipulation, urgency pressure, isolation tactics, tech unfamiliarity, romance exploitation, etc. The 5-layer analysis pipeline: (1) Industry Category Detection (max 40pts, per-cat cap 30), (2) Cross-Cutting Pattern Analysis with compound pattern detection (max 30pts), (3) Link Analysis with typosquatting detection (max 20pts), (4) Sender Analysis with domain verification (max 15pts), (5) Senior Vulnerability Analysis with score multipliers (max 15pts). Post-layer adjustments: compound pattern multipliers (up to 2.5x for romance/grandparent scams) and legitimate message score reduction (up to -50pts for verified senders with informational content). Enhanced categories: Romance (emotional/military/isolation keywords, trigger 40), Grandparent (secrecy/financial keywords, trigger 45), Funeral (burial/release/fee keywords, trigger 40), Charity (matching donation/urgency keywords, trigger 40), Pet Adoption (rehome/shipping/deposit keywords, trigger 40). Legitimate service whitelist (50+ companies across banks, pharmacies, services, utilities, healthcare) with score reduction when no suspicious patterns detected. 10 compound scam patterns with risk bonuses and multipliers. API response includes `matched_categories`, `vulnerability_factors`, and optional `Legitimate Message Analysis` layer.
- Voice AI system prompt dynamically fetches the user's active daily reminders and injects them into the conversation context. Reminder labels are sanitized before prompt injection to prevent prompt injection attacks.
- Voice AI (`/api/voice/process-request`) enriched with real-time data: ESPN sports scores (NBA/NFL/MLB/NHL/college), OpenWeatherMap weather, NewsData.io news, Wikipedia knowledge, and Bible verses (KJV). Also fetches user interests from the main DB `users.interests` column (jsonb), with learning server as fallback + auto-backfill. All external data is sanitized via `sanitizeExternalText()` and wrapped with inert-data boundaries in the system prompt. AI assistant names: female=**Ida**, male=**Clay** (configurable in PreferencesContext; legacy Ava/Max auto-migrated in both client and server). Detailed console logging for real-time data fetch debugging.
- **Health Awareness System**: `user_health_profiles` DB table stores general health, chronic conditions, mobility level, hearing/vision, and optional notes per user. API routes at `/api/health-awareness/profile` (GET/PUT/DELETE) with strict server-side input validation (allowlisted enums for all fields, 500-char cap on notes) to prevent prompt injection. `generateHealthContext()` builds adaptation rules from the health profile and injects them into the voice AI system prompt for personalized responses (e.g., slower speech for hearing challenges, larger text suggestions for vision issues). Health awareness onboarding screen (`/onboarding/health-awareness`) is a 5-step flow (intro, general health, chronic conditions, mobility, hearing/vision + notes) inserted between fast-track and home. Onboarding step progression tracked via `onboarding_step` field in users table — if app reloads mid-onboarding, routing resumes at the correct screen.
- Middleware includes rate limiting, standardized error handling, and 404 management.

**Database**:
- PostgreSQL is used as the primary database, managed by Drizzle ORM.
- The database schema is defined within the `lib/db` package.

**Adaptive Learning System**:
- Integrated from 9 reference files into the project for senior profile management, conversation personalization, and engagement tracking.
- Directory structure: `src/backend/` (server entry, services, routes), `src/frontend/` (React components, CSS), `src/database/` (SQL schema), `data/` (JSON content files).
- Database tables: `seniors`, `discovered_interests`, `emotional_patterns`, `memory_anchors`, `behavioral_patterns`, `conversation_preferences`, `conversations` (adaptive), `learning_history`, `engagement_metrics`. Plus 4 views and 3 triggers.
- Content data: `data/life_story_questions.json` (600 questions across 25+ categories), `data/conversation_templates.json` (conversation template library), `data/learning_patterns.json` (pattern recognition definitions).
- Backend services: `SeniorProfileService` (profile CRUD, memory anchors, interests), `AdaptiveLearningEngine` (conversation analysis, pattern extraction), `ContextAssemblyEngine` (LLM prompt assembly, question selection).
- Dev script: `pnpm run dev:learning` runs the standalone adaptive learning server via ts-node.
- Admin test page: `src/frontend/admin-test.html` served at `/admin/test` — 12 API tests + live chat interface.
- AI Chat endpoint: POST `/api/chat` — uses OpenAI with personalization context from adaptive learning, enriched with real-time data from Complete APIs (ESPN sports scores, OpenWeatherMap weather, NewsData.io news, Wikipedia knowledge, Bible verses) and Free APIs (jokes, trivia, history, quotes) when detected in user messages. Sports queries support NBA, NFL, MLB, NHL, college basketball, college football, and soccer.
- Fast-Track Onboarding: 2-3 minute personalization flow (4 screens: welcome, name, interests, family) at `/onboarding/fast-track`. Family step collects name, email, and relationship. On completion, family members are saved to both the adaptive learning server AND the main database (via `familyApi.addMember`), so they appear in the Family tab immediately. Backend service at `src/backend/services/SeniorShield-FastTrack-Backend.ts`, routes at `src/backend/routes/SeniorShield-FastTrack-Routes.ts` mounted at `/api/onboarding/*`. Provides 8 endpoints: complete, profile, status, update-interests, add-family, progressive-data (record/get), adaptive-learning. Progressive data collection records user preferences discovered during AI conversations. Enriched profiles feed into the adaptive learning system for personalized AI interactions.
- Free APIs Integration: `src/backend/services/SeniorShield-Free-APIs-Integration.ts` + `src/backend/routes/SeniorShield-Free-APIs-Routes.ts` — mounted at `/api/free-apis/*`. Includes: News API (requires NEWS_API_KEY), OpenWeatherMap (requires WEATHER_API_KEY), JokeAPI (free, no key), Open Trivia DB (free, no key), On This Day history (free, no key), ZenQuotes (free, no key). Daily digest endpoint combines all sources.
- Workflow: "Adaptive Learning Server" runs on port 3000.

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