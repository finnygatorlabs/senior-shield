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
- Daily Reminders tab: Users can select up to 3 active reminders from 9 presets (medication, family call, morning walk, wellness check, hydration, meals, appointments, gratitude, daily motivation) or create custom ones. The AI assistant uses these to greet users daily. Toggles available per-reminder. Backend stores preferences in `daily_reminders` table (with jsonb `metadata` column for extra config) and responses in `daily_reminder_responses` table. The "Daily Motivation" preset has a category selector (Spiritual/Bible, Stoic Philosophy, Modern Leadership, Eastern Philosophies, Philanthropic/Business Wisdom, Mix) stored in metadata. Users can change their category anytime via a "Change" button on their reminder card.
- Authentication uses JWT tokens stored in `AsyncStorage` and managed via `AuthContext`.
- The application integrates a centralized API service for all backend communication.

**Backend API (api-server)**:
- Built with Express 5, PostgreSQL, and Drizzle ORM.
- Employs Zod for validation of API requests and responses.
- API codegen is handled by Orval from an OpenAPI specification, generating React Query hooks and Zod schemas.
- Features comprehensive API endpoints for authentication, user management, voice assistance (AI queries, TTS), scam detection, family management, contact management, billing (Stripe integration), emergency services, hearing aid connectivity, administration, analytics, telecom, insurance, and facility management.
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