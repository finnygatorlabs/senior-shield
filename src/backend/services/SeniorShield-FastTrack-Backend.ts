/**
 * SeniorShield Fast-Track Onboarding Backend Service
 * Handles profile creation and progressive data collection
 * Uses in-memory storage (same pattern as other services in this server)
 */

interface FamilyMember {
  name: string;
  relationship: string;
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
  [key: string]: any;
}

interface ConversationDataEntry {
  userId: string;
  data: Record<string, any>;
  createdAt: Date;
}

class FastTrackOnboardingService {
  private profiles: Map<string, UserProfile> = new Map();
  private conversationData: ConversationDataEntry[] = [];

  async createUserProfile(userId: string, data: OnboardingData): Promise<UserProfile> {
    const now = new Date();
    const profile: UserProfile = {
      userId,
      name: data.name,
      interests: data.interests || [],
      familyMembers: data.familyMembers || [],
      createdAt: now,
      updatedAt: now,
      onboardingComplete: true,
    };

    this.profiles.set(userId, profile);
    return profile;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async updateInterests(userId: string, interests: string[]): Promise<UserProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }
    profile.interests = interests;
    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);
    return profile;
  }

  async addFamilyMember(userId: string, member: FamilyMember): Promise<UserProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }
    profile.familyMembers.push(member);
    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);
    return profile;
  }

  async recordConversationData(userId: string, conversationData: Record<string, any>): Promise<void> {
    this.conversationData.push({
      userId,
      data: conversationData,
      createdAt: new Date(),
    });
  }

  async getProgressiveData(userId: string): Promise<Record<string, any>[]> {
    return this.conversationData
      .filter(entry => entry.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 100)
      .map(entry => entry.data);
  }

  async isOnboardingComplete(userId: string): Promise<boolean> {
    const profile = this.profiles.get(userId);
    return profile?.onboardingComplete ?? false;
  }

  async getUserDataForAdaptiveLearning(userId: string): Promise<any> {
    const profile = await this.getUserProfile(userId);
    const progressiveData = await this.getProgressiveData(userId);

    return {
      profile,
      progressiveData,
      enrichedProfile: this.enrichProfileWithProgressiveData(profile, progressiveData),
    };
  }

  private enrichProfileWithProgressiveData(
    profile: UserProfile | null,
    progressiveData: Record<string, any>[]
  ): any {
    if (!profile) return null;

    const enriched: Record<string, any> = {
      name: profile.name,
      interests: [...profile.interests],
      familyMembers: [...profile.familyMembers],
      onboardingComplete: profile.onboardingComplete,
    };

    progressiveData.forEach((data) => {
      if (data.favoriteTeam) enriched.favoriteTeam = data.favoriteTeam;
      if (data.favoriteBook) enriched.favoriteBook = data.favoriteBook;
      if (data.birthday) enriched.birthday = data.birthday;
      if (data.travelHistory) enriched.travelHistory = data.travelHistory;
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
