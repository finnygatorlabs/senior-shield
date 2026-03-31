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
- Core screens include authentication, onboarding, main tabs (home, scam check, reminders, family, history, settings), subscription management, and an emergency screen.
- Daily Reminders: Users can select or create custom reminders, which the AI assistant uses for personalized greetings.
- Premium Soft-Gate System: Limits free-tier access to premium features (e.g., scam scans, number of family members) with clear upgrade paths and UI indicators.
- Daily Quotes: The home screen displays an inspirational quote from a curated collection, which can be disabled by the user.
- Authentication: Uses JWT tokens with `AsyncStorage`, `AuthContext`, and supports social sign-in (Google, Apple). Global session expiry detection is implemented.
- Centralized API service (`services/api.ts`) with a custom event system for cross-cutting concerns.

**Backend API (api-server)**:
- Built with Express 5, PostgreSQL, and Drizzle ORM, using Zod for validation.
- API codegen is handled by Orval from an OpenAPI specification, generating React Query hooks and Zod schemas.
- Comprehensive API endpoints support authentication, user management, voice assistance (AI queries, TTS), scam detection, family management, billing (Stripe), emergency services, and various integrations.
- Family Member Invitation Email: Notifies family members upon being added, explaining SeniorShield's purpose and expected notifications.
- Family Scam Alerts: Sends branded email alerts to family members for medium or high-risk scam detections.
- Scam Detection Engine: Features a 76-category framework, 600+ keywords, 250+ red flags, category-specific trigger scores, and 16 senior vulnerability multipliers. It employs a 5-layer analysis pipeline (Industry Category, Cross-Cutting Pattern, Link, Sender, Senior Vulnerability Analysis) with post-layer adjustments and a legitimate service whitelist.
- Voice AI system: Dynamically injects user's active daily reminders into conversation context and is enriched with real-time data from external APIs (sports, weather, news, knowledge, bible verses) and user interests. AI assistant names are configurable (Ida/Clay).
- Health Awareness System: Stores user health profiles (`user_health_profiles` table) and generates adaptation rules for personalized voice AI responses (e.g., slower speech, larger text). A 5-step onboarding flow collects this data.
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