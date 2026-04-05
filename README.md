# SeniorShield API

A clean, deployable Node.js + Express backend for SeniorShield.

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your DATABASE_URL to `.env`

4. Start the server:
```bash
npm start
```

Server runs on `http://localhost:3000`

### Test Endpoint

```bash
curl http://localhost:3000/api/auth/test
```

Expected response:
```json
{
  "success": true,
  "data": [{ "test": 1 }]
}
```

## Deployment on Railway

1. Connect your GitHub repository to Railway
2. Add MySQL database plugin
3. Set environment variable: `DATABASE_URL=${{MySQL.DATABASE_URL}}`
4. Deploy

The app will automatically start and connect to the database.

## Architecture

- **src/index.js** - Entry point
- **src/app.js** - Express app setup
- **src/db.js** - Lazy database initialization
- **src/routes/** - API routes

### Key Features

- ✅ Lazy database initialization (no startup crashes)
- ✅ Clean error handling
- ✅ Railway-ready configuration
- ✅ Simple, maintainable structure
