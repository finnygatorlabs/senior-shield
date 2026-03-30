/**
 * SeniorShield Fast-Track Onboarding Backend Service
 * Handles profile creation and progressive data collection
 */

import { Pool } from 'pg';

interface FamilyMember {
  name: string;
  relationship: 'Son' | 'Daughter' | 'Grandchild' | 'Other';
}

interface OnboardingData {
  name: string;
  interests: string[];
  familyMembers: FamilyMember[];
}

interface UserProfile {
  userId: string;
  name: string;
  interests: string[];
  familyMembers: FamilyMember[];
  createdAt: Date;
  updatedAt: Date;
  onboardingComplete: boolean;
}

class FastTrackOnboardingService {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Create user profile from fast-track onboarding
   */
  async createUserProfile(userId: string, data: OnboardingData): Promise<UserProfile> {
    try {
      const query = `
        INSERT INTO user_profiles (
          user_id,
          name,
          interests,
          family_members,
          onboarding_complete,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          name = $2,
          interests = $3,
          family_members = $4,
          onboarding_complete = $5,
          updated_at = NOW()
        RETURNING *;
      `;

      const result = await this.db.query(query, [
        userId,
        data.name,
        JSON.stringify(data.interests),
        JSON.stringify(data.familyMembers),
        true,
      ]);

      const profile = result.rows[0];
      return this.formatProfile(profile);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const query = `
        SELECT * FROM user_profiles WHERE user_id = $1;
      `;

      const result = await this.db.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.formatProfile(result.rows[0]);
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to get user profile');
    }
  }

  /**
   * Update interests (progressive data collection)
   */
  async updateInterests(userId: string, interests: string[]): Promise<UserProfile> {
    try {
      const query = `
        UPDATE user_profiles
        SET interests = $2, updated_at = NOW()
        WHERE user_id = $1
        RETURNING *;
      `;

      const result = await this.db.query(query, [userId, JSON.stringify(interests)]);

      if (result.rows.length === 0) {
        throw new Error('User profile not found');
      }

      return this.formatProfile(result.rows[0]);
    } catch (error) {
      console.error('Error updating interests:', error);
      throw new Error('Failed to update interests');
    }
  }

  /**
   * Add family member (progressive data collection)
   */
  async addFamilyMember(
    userId: string,
    member: FamilyMember
  ): Promise<UserProfile> {
    try {
      const profile = await this.getUserProfile(userId);

      if (!profile) {
        throw new Error('User profile not found');
      }

      const updatedMembers = [...profile.familyMembers, member];

      const query = `
        UPDATE user_profiles
        SET family_members = $2, updated_at = NOW()
        WHERE user_id = $1
        RETURNING *;
      `;

      const result = await this.db.query(query, [
        userId,
        JSON.stringify(updatedMembers),
      ]);

      return this.formatProfile(result.rows[0]);
    } catch (error) {
      console.error('Error adding family member:', error);
      throw new Error('Failed to add family member');
    }
  }

  /**
   * Record conversation data for progressive learning
   */
  async recordConversationData(
    userId: string,
    conversationData: Record<string, any>
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO conversation_data (
          user_id,
          data,
          created_at
        ) VALUES ($1, $2, NOW());
      `;

      await this.db.query(query, [userId, JSON.stringify(conversationData)]);
    } catch (error) {
      console.error('Error recording conversation data:', error);
      throw new Error('Failed to record conversation data');
    }
  }

  /**
   * Get progressive data collected during conversations
   */
  async getProgressiveData(userId: string): Promise<Record<string, any>[]> {
    try {
      const query = `
        SELECT data FROM conversation_data
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 100;
      `;

      const result = await this.db.query(query, [userId]);

      return result.rows.map((row) => row.data);
    } catch (error) {
      console.error('Error getting progressive data:', error);
      throw new Error('Failed to get progressive data');
    }
  }

  /**
   * Format profile for response
   */
  private formatProfile(dbProfile: any): UserProfile {
    return {
      userId: dbProfile.user_id,
      name: dbProfile.name,
      interests: JSON.parse(dbProfile.interests || '[]'),
      familyMembers: JSON.parse(dbProfile.family_members || '[]'),
      createdAt: new Date(dbProfile.created_at),
      updatedAt: new Date(dbProfile.updated_at),
      onboardingComplete: dbProfile.onboarding_complete,
    };
  }

  /**
   * Check if user has completed onboarding
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      return profile?.onboardingComplete ?? false;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Get all user data for adaptive learning
   */
  async getUserDataForAdaptiveLearning(userId: string): Promise<any> {
    try {
      const profile = await this.getUserProfile(userId);
      const progressiveData = await this.getProgressiveData(userId);

      return {
        profile,
        progressiveData,
        enrichedProfile: this.enrichProfileWithProgressiveData(
          profile,
          progressiveData
        ),
      };
    } catch (error) {
      console.error('Error getting user data for adaptive learning:', error);
      throw new Error('Failed to get user data');
    }
  }

  /**
   * Enrich profile with data collected during conversations
   */
  private enrichProfileWithProgressiveData(
    profile: UserProfile | null,
    progressiveData: Record<string, any>[]
  ): any {
    if (!profile) return null;

    const enriched = { ...profile };

    // Extract and merge progressive data
    progressiveData.forEach((data) => {
      if (data.favoriteTeam) {
        enriched.favoriteTeam = data.favoriteTeam;
      }
      if (data.favoriteBook) {
        enriched.favoriteBook = data.favoriteBook;
      }
      if (data.birthday) {
        enriched.birthday = data.birthday;
      }
      if (data.travelHistory) {
        enriched.travelHistory = data.travelHistory;
      }
      if (data.additionalInterests) {
        enriched.interests = [
          ...new Set([...enriched.interests, ...data.additionalInterests]),
        ];
      }
    });

    return enriched;
  }
}

export default FastTrackOnboardingService;
