/**
 * SeniorShield Fast-Track Onboarding Routes
 * API endpoints for onboarding flow and progressive data collection
 */

import { Router, Request, Response, IRouter } from 'express';
import FastTrackOnboardingService from '../services/SeniorShield-FastTrack-Backend';

const router: IRouter = Router();

const onboardingService = new FastTrackOnboardingService();

router.post('/complete', async (req: Request, res: Response) => {
  try {
    const { userId, name, interests, familyMembers } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        success: false,
        error: 'userId and name are required',
      });
    }

    const profile = await onboardingService.createUserProfile(userId, {
      name,
      interests: interests || [],
      familyMembers: familyMembers || [],
    });

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      profile,
    });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding',
    });
  }
});

router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    const profile = await onboardingService.getUserProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
      });
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

router.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    const isComplete = await onboardingService.isOnboardingComplete(userId);

    res.json({
      success: true,
      userId,
      onboardingComplete: isComplete,
    });
  } catch (error) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get onboarding status' });
  }
});

router.put('/interests/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const { interests } = req.body;

    if (!Array.isArray(interests)) {
      return res.status(400).json({
        success: false,
        error: 'interests must be an array',
      });
    }

    const profile = await onboardingService.updateInterests(userId, interests);

    res.json({ success: true, message: 'Interests updated', profile });
  } catch (error) {
    console.error('Update interests error:', error);
    res.status(500).json({ success: false, error: 'Failed to update interests' });
  }
});

router.post('/family/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const { name, relationship } = req.body;

    if (!name || !relationship) {
      return res.status(400).json({
        success: false,
        error: 'name and relationship are required',
      });
    }

    const profile = await onboardingService.addFamilyMember(userId, { name, relationship });

    res.json({ success: true, message: 'Family member added', profile });
  } catch (error) {
    console.error('Add family member error:', error);
    res.status(500).json({ success: false, error: 'Failed to add family member' });
  }
});

router.post('/progressive-data/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const conversationData = req.body;

    await onboardingService.recordConversationData(userId, conversationData);

    res.json({ success: true, message: 'Conversation data recorded' });
  } catch (error) {
    console.error('Record conversation data error:', error);
    res.status(500).json({ success: false, error: 'Failed to record conversation data' });
  }
});

router.get('/progressive-data/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    const data = await onboardingService.getProgressiveData(userId);

    res.json({
      success: true,
      userId,
      progressiveData: data,
      count: data.length,
    });
  } catch (error) {
    console.error('Get progressive data error:', error);
    res.status(500).json({ success: false, error: 'Failed to get progressive data' });
  }
});

router.get('/adaptive-learning/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    const userData = await onboardingService.getUserDataForAdaptiveLearning(userId);

    res.json({
      success: true,
      userId,
      ...userData,
    });
  } catch (error) {
    console.error('Get adaptive learning data error:', error);
    res.status(500).json({ success: false, error: 'Failed to get adaptive learning data' });
  }
});

router.get('/info', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'SeniorShield Fast-Track Onboarding',
    version: '1.0.0',
    features: {
      fastOnboarding: '2-3 minute onboarding flow',
      progressiveDataCollection: 'Collect data during conversations',
      adaptiveLearning: 'Integration with adaptive learning system',
      familyTracking: 'Track family members for personalization',
    },
    endpoints: {
      complete: 'POST /api/onboarding/complete',
      getProfile: 'GET /api/onboarding/profile/:userId',
      checkStatus: 'GET /api/onboarding/status/:userId',
      updateInterests: 'PUT /api/onboarding/interests/:userId',
      addFamily: 'POST /api/onboarding/family/:userId',
      recordData: 'POST /api/onboarding/progressive-data/:userId',
      getData: 'GET /api/onboarding/progressive-data/:userId',
      adaptiveLearning: 'GET /api/onboarding/adaptive-learning/:userId',
    },
  });
});

export default router;
