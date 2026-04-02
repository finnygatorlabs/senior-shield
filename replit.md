# SeniorShield

## Overview

SeniorShield is a full-stack mobile application designed to enhance digital safety and provide accessible tech support for seniors (65+). It offers voice-guided assistance, AI-powered scam detection with risk scoring, and a family alert system for high-risk threats. Key features include an emergency SOS, a structured onboarding process, and subscription billing for premium functionalities. The project aims to empower seniors with technology, ensure their digital safety, and strengthen their family support network.

## User Preferences

I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `lib/api-spec`.
Do not make changes to the file `artifacts/senior-shield/app/emergency.tsx`.

## System Architecture

The project is structured as a pnpm monorepo using Node.js 24 and TypeScript 5.9.

**Mobile Application (SeniorShield)**:
- Developed with Expo (React Native) and Expo Router v6, targeting iOS with an Airbnb-inspired design.
- UI/UX features a clean blue color scheme (`#2563EB`) and the Inter font.
- Core screens include authentication (hero banner signup with seniors photo, no user type selection — all users are seniors), onboarding, main tabs (home, scam check, reminders, family, history, settings), subscription management, and an emergency screen.
- Daily Reminders: Users can select preset or create custom reminders with full scheduling: time picker (HH:MM), frequency (daily/weekly/one-time), day-of-week selector. Each reminder card shows its scheduled time and frequency badge, with a "Set Time" button to open the schedule editor. The scheduler cron job handles `once` frequency by auto-deactivating the reminder after it fires. Backend validates time ranges (00-23, 00-59), frequency enum, and requires days_of_week for weekly. API endpoint: `PUT /reminders/:id/schedule`.
- Premium Soft-Gate System: Limits free-tier access to premium features (e.g., scam scans, number of family members) with clear upgrade paths and UI indicators.
- Daily Quotes & Facts: The home screen alternates between inspirational quotes and "Fact of the Day" entries from curated collections. Facts display with a gold accent and label. Can be disabled by the user.
- Authentication: Uses JWT tokens with `AsyncStorage`, `AuthContext`, and supports social sign-in (Google, Apple). Global session expiry detection is implemented.
- Google Auth: Uses `expo-auth-session/providers/google` with fallback IDs to prevent crashes when native client IDs aren't configured. Platform-specific: `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (web), `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (iOS), `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (Android). Button gracefully disables with user-facing message when IDs are missing.
- Platform Safety: All `window.*`, `document.*`, and `localStorage` usage is guarded by `Platform.OS === "web"` checks. Native-only features (Haptics, Linking) are guarded by `Platform.OS !== "web"`. `Alert.alert` is used on native; web uses inline error/info components.
- Centralized API service (`services/api.ts`) with a custom event system for cross-cutting concerns.

**Backend API (api-server)**:
- Built with Express 5, PostgreSQL, and Drizzle ORM, using Zod for validation.
- API codegen is handled by Orval from an OpenAPI specification, generating React Query hooks and Zod schemas.
- Comprehensive API endpoints support authentication, user management, voice assistance (AI queries, TTS), scam detection, family management, billing (Stripe), emergency services, and various integrations.
- Family Member Invitation Email: Notifies family members upon being added, explaining SeniorShield's purpose and expected notifications.
- Family Scam Alerts: Sends branded email alerts to family members for medium or high-risk scam detections.
- Scam Detection Engine: Features a 76-category framework, 600+ keywords, 250+ red flags, category-specific trigger scores, and 16 senior vulnerability multipliers. It employs a 5-layer analysis pipeline (Industry Category, Cross-Cutting Pattern, Link, Sender, Senior Vulnerability Analysis) with post-layer adjustments and a legitimate service whitelist.
- Voice AI system: Dynamically injects user's active daily reminders into conversation context and is enriched with real-time data from external APIs and user interests. AI assistant names are configurable (Ida/Clay). The system prompt emphasizes proactive engagement, health awareness acknowledgment, and interest integration. All real-time API calls use `fetchWithRetry()` with fallback context messages. Integrated APIs: OpenWeatherMap (weather), Open-Meteo (air quality/AQI), ESPN (sports), NewsData.io (news), TimeAPI.io (world time with JS Date fallback), Wikipedia (knowledge), Bible API (verses), Open Trivia DB (trivia/quizzes), JokeAPI (clean jokes), Free Dictionary API (word definitions/Scrabble), Open Library (book search), Open Food Facts (nutrition info), MusicBrainz (artist/album/song lookup).
- Scam alert emails use Resend (requires RESEND_API_KEY). When email service is not configured, the alert endpoint returns a clear message instead of silently reporting "sent to 0".
- Health Awareness System: Stores user health profiles (`user_health_profiles` table) and generates adaptation rules for personalized voice AI responses (e.g., slower speech, larger text). A 5-step onboarding flow collects this data.
- Reminder Scheduler System: Automated reminder delivery via external Render cron job (GET /api/scheduler/run/:secret). Checks active reminders with scheduled times against user timezones, sends push notifications to users via Firebase Cloud Messaging and email notifications to primary family members via Resend, tracks history in `reminder_history` table. Services in `artifacts/api-server/src/services/`: reminder-utils.ts, reminder-email-service.ts, reminder-scheduler.ts, firebase-push-service.ts.
- Push Notifications: Firebase Cloud Messaging (FCM) via `firebase-admin` on server, `expo-notifications` + `expo-device` on client. Device tokens stored in `push_tokens` table. Registration endpoint: POST /api/push-tokens/register (requires auth). Frontend hook: `artifacts/senior-shield/hooks/usePushNotifications.ts`. Requires FIREBASE_SERVICE_ACCOUNT_KEY env var for server-side sending. Firebase config files (google-services.json, GoogleService-Info.plist) needed in `artifacts/senior-shield/` for native builds. **Expo Go compatibility**: `expo-notifications` is lazy-loaded via dynamic import with `Constants.appOwnership` check — remote push was removed from Expo Go in SDK 53. The app gracefully skips push setup in Expo Go and works fully in development builds.
- Middleware: Includes rate limiting, standardized error handling, and 404 management.

**Database**:
- PostgreSQL is the primary database, managed by Drizzle ORM.
- Schema defined within the `lib/db` package.

**Adaptive Learning System**:
- Integrated for senior profile management, conversation personalization, and engagement tracking.
- Uses dedicated database tables (`seniors`, `discovered_interests`, `emotional_patterns`, etc.) and content data (`life_story_questions.json`, `conversation_templates.json`).
- Backend services: `SeniorProfileService`, `AdaptiveLearningEngine`, `ContextAssemblyEngine`.
- Provides a fast-track onboarding flow to collect personalization data (name, interests, family) which feeds into the adaptive learning system for personalized AI interactions.
- Integrates with Free APIs (News, Weather, Joke, Trivia, History, Quotes).

**Monorepo Structure**:
- `artifacts/api-server`: Express API server.
- `artifacts/senior-shield`: Expo React Native mobile application.
- `lib/api-spec`: OpenAPI specification and Orval configuration.
- `lib/api-client-react`: Generated React Query hooks.
- `lib/api-zod`: Generated Zod schemas.
- `lib/db`: Drizzle ORM schema and database connection.

## External Dependencies

- **OpenAI**: GPT-4o-mini for voice assistance and text-to-speech.
- **Resend**: Transactional email service.
- **Stripe**: Subscription billing, checkout, and webhooks.
- **PostgreSQL**: Primary relational database.
- **Expo**: React Native application development framework.
- **React Native**: Mobile application framework.
- **Orval**: API client and schema code generation.
- **Zod**: Schema declaration and validation.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **AsyncStorage**: Local storage for mobile application.
- **Google OAuth**: For Google sign-in.
- **Telecom Carriers (e.g., Verizon, AT&T, T-Mobile)**: For telecom-related features.
- **Medicare**: For insurance-related features.
- **ESPN**: Real-time sports scores.
- **OpenWeatherMap**: Weather data.
- **NewsData.io**: News articles.
- **Wikipedia**: Knowledge base.
- **TimeAPI.io**: World time lookups (with JS Date fallback).
- **Open-Meteo**: Air quality index (AQI) data.
- **Open Trivia DB**: Trivia questions for games.
- **JokeAPI**: Clean, safe-mode jokes.
- **Free Dictionary API**: Word definitions for Scrabble players.
- **Open Library**: Book search and recommendations.
- **Open Food Facts**: Nutrition information lookup.
- **MusicBrainz**: Music artist, album, and song database (free, no key).