/**
 * SeniorShield Main Server Entry Point
 * 
 * This is the header/entry point that ties together all 8 implementation files:
 * 1. SeniorShield-Backend-Implementation.ts (services)
 * 2. SeniorShield-Backend-Routes.ts (API routes)
 * 3. SeniorShield-Frontend-Components.tsx (React components)
 * 4. SeniorShield-Frontend-Components.css (styling)
 * 5. SeniorShield-Database-Schema.sql (database)
 * 6. SeniorShield-Life-Story-Questions.json (content)
 * 7. SeniorShield-Conversation-Templates.json (content)
 * 8. SeniorShield-Learning-Pattern-Library.json (content)
 * 
 * File Location: src/backend/index.ts (or src/index.ts)
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Import backend services and routes
// These come from SeniorShield-Backend-Implementation.ts and SeniorShield-Backend-Routes.ts
import routes from './routes/SeniorShield-Backend-Routes';
import freeApisRoutes from './routes/SeniorShield-Free-APIs-Routes';
import completeAPIsRoutes from './routes/SeniorShield-Complete-APIs-Routes';
import onboardingRoutes from './routes/SeniorShield-FastTrack-Routes';
import { SeniorProfileService } from './services/SeniorShield-Backend-Implementation';

// ============================================================================
// CONFIGURATION
// ============================================================================

const app: Express = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// CONTENT LOADING
// ============================================================================

/**
 * Load content files (JSON) into memory for fast access
 * These files are used by the adaptive learning engine
 */

let contentCache = {
  lifeStoryQuestions: [] as any[],
  conversationTemplates: [] as any[],
  learningPatterns: [] as any[]
};

function loadContentFiles() {
  try {
    // Load life story questions
    const questionsPath = path.join(__dirname, '../../data/life_story_questions.json');
    if (fs.existsSync(questionsPath)) {
      const questionsData = fs.readFileSync(questionsPath, 'utf-8');
      const parsed = JSON.parse(questionsData);
      contentCache.lifeStoryQuestions = parsed.life_story_questions || parsed;
      console.log(`✓ Loaded ${contentCache.lifeStoryQuestions.length} life story questions`);
    }

    const templatesPath = path.join(__dirname, '../../data/conversation_templates.json');
    if (fs.existsSync(templatesPath)) {
      const templatesData = fs.readFileSync(templatesPath, 'utf-8');
      const parsed = JSON.parse(templatesData);
      contentCache.conversationTemplates = parsed.conversation_templates || parsed;
      console.log(`✓ Loaded ${contentCache.conversationTemplates.length} conversation templates`);
    }

    const patternsPath = path.join(__dirname, '../../data/learning_patterns.json');
    if (fs.existsSync(patternsPath)) {
      const patternsData = fs.readFileSync(patternsPath, 'utf-8');
      const parsed = JSON.parse(patternsData);
      contentCache.learningPatterns = parsed.learning_patterns || parsed;
      console.log(`✓ Loaded ${contentCache.learningPatterns.length} learning patterns`);
    }

    return true;
  } catch (error) {
    console.error('Error loading content files:', error);
    return false;
  }
}

// Make content available globally
declare global {
  var seniorShieldContent: typeof contentCache;
}
global.seniorShieldContent = contentCache;

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Mount all API routes from SeniorShield-Backend-Routes.ts
 * This includes:
 * - Profile endpoints (CRUD)
 * - Conversation endpoints
 * - Context endpoints
 * - Insights endpoints
 * - Learning history endpoints
 * - Health check
 */
app.use('/api', routes);
app.use('/api/free-apis', freeApisRoutes);
app.use('/api/complete-apis', completeAPIsRoutes);
app.use('/api/onboarding', onboardingRoutes);

// ============================================================================
// STATIC FILES (for frontend)
// ============================================================================

/**
 * Serve static files for the React frontend
 * The frontend components (SeniorShield-Frontend-Components.tsx) 
 * and CSS (SeniorShield-Frontend-Components.css) are served here
 */

// Serve public files
app.use(express.static(path.join(__dirname, '../../client/public')));

// Serve built React app (if using Create React App or similar)
const buildPath = path.join(__dirname, '../../client/build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
}

// ============================================================================
// ADMIN TESTING PAGE
// ============================================================================

app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../frontend/admin-test.html'));
});

app.get('/admin/test', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../frontend/admin-test.html'));
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * Health check endpoint
 * Returns system status and loaded content information
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SeniorShield Adaptive Learning Engine',
    environment: NODE_ENV,
    port: PORT,
    content: {
      lifeStoryQuestions: contentCache.lifeStoryQuestions.length,
      conversationTemplates: contentCache.conversationTemplates.length,
      learningPatterns: contentCache.learningPatterns.length
    }
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 Not Found handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

/**
 * Global error handler
 * Catches all errors from routes and middleware
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Initialize and start the server
 */
async function startServer() {
  try {
    console.log('\n🚀 Starting SeniorShield Adaptive Learning Engine...\n');

    // Load content files
    console.log('📚 Loading content files...');
    const contentLoaded = loadContentFiles();
    if (!contentLoaded) {
      console.warn('⚠️  Some content files could not be loaded. System will continue with available content.');
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log('\n📋 Available Endpoints:');
      console.log('   POST   /api/profiles - Create profile');
      console.log('   GET    /api/profiles/:seniorId - Get profile');
      console.log('   PUT    /api/profiles/:seniorId - Update profile');
      console.log('   POST   /api/conversations - Process conversation');
      console.log('   GET    /api/conversations/:seniorId - Get conversation history');
      console.log('   GET    /api/context/:seniorId - Get assembled context');
      console.log('   POST   /api/llm-prompt - Generate LLM prompt');
      console.log('   GET    /api/next-question/:seniorId - Get next question');
      console.log('   GET    /api/insights/:seniorId - Get insights');
      console.log('   GET    /api/interests/:seniorId - Get interests');
      console.log('   GET    /api/memory-anchors/:seniorId - Get memory anchors');
      console.log('   GET    /api/learning-history/:seniorId - Get learning history');
      console.log('   GET    /health - Health check');
      console.log('\n');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n⏹️  SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n⏹️  SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// ============================================================================
// EXPORTS (for testing or programmatic use)
// ============================================================================

export { app, contentCache };
