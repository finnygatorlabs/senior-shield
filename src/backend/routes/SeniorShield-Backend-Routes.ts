/**
 * SeniorShield Backend Routes
 * Express API endpoints for the adaptive learning system
 */

import express, { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import {
  SeniorProfileService,
  AdaptiveLearningEngine,
  ContextAssemblyEngine,
  Conversation,
  MemoryAnchor,
  DiscoveredInterest
} from '../services/SeniorShield-Backend-Implementation';
import { FreeAPIsService } from '../services/SeniorShield-Free-APIs-Integration';

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const freeApis = new FreeAPIsService();

const router = Router();

// Initialize services
const profileService = new SeniorProfileService();
const learningEngine = new AdaptiveLearningEngine(profileService);
const contextEngine = new ContextAssemblyEngine(profileService, learningEngine);

// ============================================================================
// PROFILE ENDPOINTS
// ============================================================================

/**
 * POST /api/profiles
 * Create a new senior profile
 */
router.post('/profiles', (req: Request, res: Response) => {
  try {
    const { seniorId, name, location, timezone } = req.body;

    if (!seniorId || !name || !location || !timezone) {
      return res.status(400).json({
        error: 'Missing required fields: seniorId, name, location, timezone'
      });
    }

    const profile = profileService.createProfile(seniorId, {
      name,
      location,
      timezone
    });

    res.status(201).json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

/**
 * GET /api/profiles/:seniorId
 * Get a senior profile
 */
router.get('/profiles/:seniorId', (req: Request, res: Response) => {
  try {
    const seniorId = req.params.seniorId as string;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

/**
 * PUT /api/profiles/:seniorId
 * Update a senior profile
 */
router.put('/profiles/:seniorId', (req: Request, res: Response) => {
  try {
    const seniorId = req.params.seniorId as string;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update allowed fields
    if (req.body.conversation_preferences) {
      profile.conversation_preferences = {
        ...profile.conversation_preferences,
        ...req.body.conversation_preferences
      };
    }

    if (req.body.topics_to_avoid) {
      profile.topics_to_avoid = req.body.topics_to_avoid;
    }

    profileService.updateProfile(profile);

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============================================================================
// CONVERSATION ENDPOINTS
// ============================================================================

/**
 * POST /api/conversations
 * Process a conversation and update profile
 */
router.post('/conversations', (req: Request, res: Response) => {
  try {
    const {
      seniorId,
      conversationId,
      seniorInput,
      aiResponse,
      topicsDiscussed,
      emotionalTone,
      engagementScore,
      newMemoryAnchors,
      durationSeconds
    } = req.body;

    if (!seniorId || !seniorInput || !aiResponse) {
      return res.status(400).json({
        error: 'Missing required fields: seniorId, seniorInput, aiResponse'
      });
    }

    const profile = profileService.getProfile(seniorId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Create conversation record
    const conversation: Conversation = {
      conversation_id: conversationId || `conv_${Date.now()}`,
      senior_id: seniorId,
      timestamp: new Date(),
      duration_seconds: durationSeconds || 0,
      senior_input: seniorInput,
      ai_response: aiResponse,
      topics_discussed: topicsDiscussed || [],
      emotional_tone: emotionalTone || 'neutral',
      engagement_score: engagementScore || 50,
      new_memory_anchors: newMemoryAnchors
    };

    // Analyze conversation and update profile
    learningEngine.analyzeConversation(conversation);

    res.json({
      success: true,
      message: 'Conversation processed',
      personalizationScore: profile.personalization_score,
      conversationCount: profile.conversation_count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process conversation' });
  }
});

/**
 * GET /api/conversations/:seniorId
 * Get conversation history for a senior
 */
router.get('/conversations/:seniorId', (req: Request, res: Response) => {
  try {
    const seniorId = req.params.seniorId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const history = learningEngine.getConversationHistory(seniorId, limit);

    res.json({
      seniorId,
      conversationCount: history.length,
      conversations: history
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

// ============================================================================
// CONTEXT ENDPOINTS
// ============================================================================

/**
 * GET /api/context/:seniorId
 * Get assembled context for LLM
 */
router.get('/context/:seniorId', (req: Request, res: Response) => {
  try {
    const seniorId = req.params.seniorId as string;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const context = contextEngine.assembleContext(seniorId);
    const personalizationLevel = learningEngine.getPersonalizationLevel(profile.personalization_score);

    res.json({
      seniorId,
      personalizationScore: profile.personalization_score,
      personalizationLevel,
      context,
      conversationCount: profile.conversation_count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assemble context' });
  }
});

/**
 * POST /api/llm-prompt
 * Generate LLM prompt with context
 */
router.post('/llm-prompt', (req: Request, res: Response) => {
  try {
    const { seniorId, seniorInput } = req.body;

    if (!seniorId || !seniorInput) {
      return res.status(400).json({
        error: 'Missing required fields: seniorId, seniorInput'
      });
    }

    const profile = profileService.getProfile(seniorId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const prompt = contextEngine.generateLLMPrompt(seniorId, seniorInput);

    res.json({
      seniorId,
      prompt,
      personalizationScore: profile.personalization_score
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate prompt' });
  }
});

/**
 * GET /api/next-question/:seniorId
 * Get the next question to ask
 */
router.get('/next-question/:seniorId', (req: Request, res: Response) => {
  try {
    const seniorId = req.params.seniorId as string;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const question = contextEngine.selectQuestion(seniorId);
    const personalizationLevel = learningEngine.getPersonalizationLevel(profile.personalization_score);

    res.json({
      seniorId,
      question,
      personalizationLevel,
      personalizationScore: profile.personalization_score
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to select question' });
  }
});

// ============================================================================
// INSIGHTS ENDPOINTS
// ============================================================================

/**
 * GET /api/insights/:seniorId
 * Get insights about a senior
 */
router.get('/insights/:seniorId', (req: Request, res: Response) => {
  try {
    const seniorId = req.params.seniorId as string;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      seniorId,
      personalizationScore: profile.personalization_score,
      personalizationLevel: learningEngine.getPersonalizationLevel(profile.personalization_score),
      conversationCount: profile.conversation_count,
      discoveredInterests: profile.discovered_interests,
      emotionalPatterns: profile.emotional_patterns,
      memoryAnchors: profile.memory_anchors,
      behavioralPatterns: profile.behavioral_patterns,
      learningHistory: profile.learning_history.slice(-10) // Last 10 discoveries
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve insights' });
  }
});

/**
 * GET /api/interests/:seniorId
 * Get discovered interests for a senior
 */
router.get('/interests/:seniorId', (req: Request, res: Response) => {
  try {
    const seniorId = req.params.seniorId as string;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const interests = profile.discovered_interests.sort((a, b) => b.confidence - a.confidence);

    res.json({
      seniorId,
      interests,
      totalInterests: interests.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve interests' });
  }
});

/**
 * GET /api/memory-anchors/:seniorId
 * Get memory anchors for a senior
 */
router.get('/memory-anchors/:seniorId', (req: Request, res: Response) => {
  try {
    const seniorId = req.params.seniorId as string;
    const profile = profileService.getProfile(seniorId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const anchors = profile.memory_anchors;

    res.json({
      seniorId,
      anchors,
      totalAnchors: anchors.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve memory anchors' });
  }
});

// ============================================================================
// LEARNING HISTORY ENDPOINTS
// ============================================================================

/**
 * GET /api/learning-history/:seniorId
 * Get learning history for a senior
 */
router.get('/learning-history/:seniorId', (req: Request, res: Response) => {
  try {
    const seniorId = req.params.seniorId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const profile = profileService.getProfile(seniorId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const history = profile.learning_history.slice(-limit);

    res.json({
      seniorId,
      learningHistory: history,
      totalDiscoveries: profile.learning_history.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve learning history' });
  }
});

// ============================================================================
// AI CHAT ENDPOINT
// ============================================================================

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { seniorId, message } = req.body;

    if (!seniorId || !message) {
      return res.status(400).json({ error: 'Missing required fields: seniorId, message' });
    }

    let profile = profileService.getProfile(seniorId);
    if (!profile) {
      profileService.createProfile(seniorId, { name: 'User', location: 'Unknown', timezone: 'UTC' });
      profile = profileService.getProfile(seniorId);
    }

    const systemPrompt = contextEngine.generateLLMPrompt(seniorId, message);

    let realTimeContext = '';
    const lowerMsg = message.toLowerCase();

    const needsWeather = /weather|temperature|forecast|rain|snow|sunny|cold|hot|humid/i.test(lowerMsg);
    const needsNews = /news|headline|what.s happening|current event|latest/i.test(lowerMsg);
    const needsJoke = /joke|funny|laugh|humor|make me laugh/i.test(lowerMsg);
    const needsHistory = /today in history|on this day|what happened today|historical/i.test(lowerMsg);
    const needsQuote = /quote|inspirat|motivat|wisdom|saying/i.test(lowerMsg);
    const needsTrivia = /trivia|quiz|test my knowledge|brain teaser/i.test(lowerMsg);
    const needsSports = /score|who won|game last|playoffs|championship|super bowl|world series|nba|nfl|mlb|standings/i.test(lowerMsg);

    const fetches: Promise<void>[] = [];

    if (needsWeather) {
      const cityMatch = lowerMsg.match(/(?:weather|temperature|forecast)\s+(?:in|for|at)\s+([a-zA-Z\s]+)/i);
      const city = cityMatch ? cityMatch[1].trim() : (profile!.basic_info?.location?.split(',')[0] || 'New York');
      fetches.push(freeApis.getWeather(city).then(w => {
        if (w) realTimeContext += `\n[REAL-TIME WEATHER for ${w.location}]: Temperature: ${w.temperature}°F (feels like ${w.feelsLike}°F), ${w.description}, Humidity: ${w.humidity}%, Wind: ${w.windSpeed} mph.`;
      }).catch(() => {}));
    }

    if (needsNews || needsSports) {
      const category = needsSports ? 'sports' : 'general';
      fetches.push(freeApis.getTopNews(category, 'us', 5).then(articles => {
        if (articles.length > 0 && articles[0].title !== 'News API not configured') {
          realTimeContext += `\n[REAL-TIME ${needsSports ? 'SPORTS' : ''} NEWS HEADLINES as of ${new Date().toLocaleDateString()}]:\n` +
            articles.map((a, i) => `${i + 1}. "${a.title}" - ${a.source} (${new Date(a.publishedAt).toLocaleDateString()})`).join('\n');
        } else if (needsSports) {
          realTimeContext += `\n[NOTE: Live sports scores are not available right now. Be honest and tell the user you don't have access to today's scores, but engage about their interest in sports.]`;
        }
      }).catch(() => {}));
    }

    if (needsJoke) {
      fetches.push(freeApis.getJoke('Pun').then(j => {
        if (j) {
          if (j.setup && j.delivery) realTimeContext += `\n[JOKE]: Setup: "${j.setup}" Punchline: "${j.delivery}"`;
          else if (j.joke) realTimeContext += `\n[JOKE]: "${j.joke}"`;
        }
      }).catch(() => {}));
    }

    if (needsHistory) {
      fetches.push(freeApis.getHistoryFact().then(facts => {
        if (facts.length > 0) {
          realTimeContext += `\n[ON THIS DAY IN HISTORY - ${new Date().toLocaleDateString()}]:\n` +
            facts.map(f => `- ${f.year}: ${f.text}`).join('\n');
        }
      }).catch(() => {}));
    }

    if (needsQuote) {
      fetches.push(freeApis.getQuote().then(q => {
        if (q) realTimeContext += `\n[INSPIRATIONAL QUOTE]: "${q.content}" - ${q.author}`;
      }).catch(() => {}));
    }

    if (needsTrivia) {
      fetches.push(freeApis.getTrivia(3, 'easy').then(questions => {
        if (questions.length > 0) {
          realTimeContext += `\n[TRIVIA QUESTIONS]:\n` +
            questions.map((q, i) => `${i + 1}. ${q.question} (Answer: ${q.correctAnswer})`).join('\n');
        }
      }).catch(() => {}));
    }

    if (fetches.length > 0) await Promise.all(fetches);

    const enrichedPrompt = realTimeContext
      ? systemPrompt + '\n\nIMPORTANT REAL-TIME DATA (use this to give accurate, factual answers):' + realTimeContext
      : systemPrompt;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: enrichedPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response right now.";

    const topics: string[] = [];
    const topicPatterns: Record<string, RegExp> = {
      gardening: /garden|plant|flower|vegetable|grow|seed|soil/i,
      cooking: /cook|recipe|bake|kitchen|meal|food/i,
      family: /family|grandchild|grandson|granddaughter|daughter|son|wife|husband/i,
      sports: /sport|game|team|baseball|football|basketball|soccer/i,
      reading: /book|read|novel|author|library/i,
      music: /music|song|sing|concert|instrument|piano|guitar/i,
      travel: /travel|trip|vacation|visit|country|city/i,
      health: /health|exercise|walk|doctor|medicine|wellness/i,
    };
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(message) || pattern.test(aiResponse)) topics.push(topic);
    }

    const conversation: Conversation = {
      conversation_id: `conv_${Date.now()}`,
      senior_id: seniorId,
      timestamp: new Date(),
      senior_input: message,
      ai_response: aiResponse,
      topics_discussed: topics,
      emotional_tone: 'positive',
      engagement_score: 75 + Math.floor(Math.random() * 20),
      duration_seconds: 0,
    };
    learningEngine.analyzeConversation(conversation);

    res.json({
      response: aiResponse,
      personalizationScore: profile!.personalization_score,
      conversationCount: profile!.conversation_count,
    });
  } catch (error: any) {
    console.error('Chat error:', error?.message || error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'SeniorShield Adaptive Learning Engine'
  });
});

export default router;
