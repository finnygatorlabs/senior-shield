# Workspace

## Project: SeniorShield

A full-stack mobile app for seniors (65+) with:
- **Voice-guided tech help** (Ask any question, get plain-language guidance via OpenAI GPT-4o-mini or rule-based fallback)
- **Scam message detection** (Paste suspicious texts/emails; get 0-100 risk score + explanation)
- **Family alert system** (Family members get notified on high-risk scam detection)
- **Subscription billing** (Stripe checkout for Pro plan)
- **Onboarding flow** (3 steps: features intro, customization, family invite)
- **Emergency screen** (911 call, family SOS, scam emergency guide)
- **Settings & Support** (FAQ accordion, contact form, preferences)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) with Expo Router v6
- **Design**: Clean blue (#2563EB), Inter font, iOS/Airbnb-inspired

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   ├── mockup-sandbox/     # Vite component preview server
│   └── senior-shield/      # Expo React Native mobile app
│       ├── app/
│       │   ├── _layout.tsx          # Root layout (fonts, providers, auth guard)
│       │   ├── auth/                # welcome, login, signup screens
│       │   ├── onboarding/          # step1, step2, step3 screens
│       │   ├── (tabs)/              # home, scam, family, settings + _layout
│       │   ├── subscription.tsx     # Pro plan upgrade screen
│       │   ├── emergency.tsx        # Emergency screen (911, SOS)
│       │   └── support.tsx          # Help/FAQ + contact form
│       ├── context/AuthContext.tsx  # JWT auth (AsyncStorage) + AuthProvider
│       ├── hooks/useTheme.ts        # Dark/light theme hook
│       └── constants/colors.ts      # Color palette (light/dark)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
└── scripts/                # Utility scripts
```

## API Routes (api-server)

- `GET /api/health` — health check
- `POST /api/auth/signup` — register user (returns JWT)
- `POST /api/auth/login` — login (returns JWT)
- `GET /api/user/profile` — get profile
- `PUT /api/user/profile` — update profile (incl. onboarding_completed)
- `GET/PUT /api/user/preferences` — user preferences
- `POST /api/voice/process-request` — voice/text AI query (GPT-4o-mini or fallback)
- `POST /api/scam/analyze` — scam detection (risk score 0-100)
- `POST /api/scam/feedback` — feedback on analysis
- `GET /api/family/members` — list family members
- `POST /api/family/add-member` — invite family member by email
- `DELETE /api/family/member/:id` — remove family member
- `POST /api/alerts/send` — send emergency alert to family
- `POST /api/billing/create-checkout` — Stripe checkout session
- `POST /api/support/ticket` — submit support ticket

## Database Tables

users, user_tiers, user_preferences, family_relationships, voice_assistance_history, scam_analysis, scam_detection_feedback, alerts, support_tickets

## Auth

JWT tokens stored in AsyncStorage via AuthContext. `setAuthTokenGetter` wired to generated API client. App routing guard in `_layout.tsx` redirects to auth/onboarding/home based on user state.

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)
- `OPENAI_API_KEY` — GPT-4o-mini for voice assistance (optional, has fallback)
- `STRIPE_SECRET_KEY` — Stripe billing (optional, checkout disabled without it)
- `JWT_SECRET` — JWT signing secret (defaults to dev value)
- `EXPO_PUBLIC_DOMAIN` — set to REPLIT_DEV_DOMAIN for API calls from mobile

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/db run push` — push DB schema changes

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers
- Auth: `src/lib/auth.ts` — JWT middleware (`requireAuth`, `AuthRequest`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec. Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`.
