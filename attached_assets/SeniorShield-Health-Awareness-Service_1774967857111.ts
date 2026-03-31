/**
 * SeniorShield Health Awareness Service
 * Manages health data storage, retrieval, and AI context generation
 */

import { Pool } from 'pg';

interface HealthData {
  generalHealth: string;
  chronicConditions: string[];
  mobilityLevel: string;
  hearingVision: string[];
  additionalNotes?: string;
}

interface UserHealthProfile {
  userId: string;
  healthData: HealthData;
  createdAt: Date;
  updatedAt: Date;
}

interface HealthContext {
  healthSummary: string;
  adaptationRules: string[];
  communicationPreferences: string[];
  accessibilityNeeds: string[];
}

class HealthAwarenessService {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Save or update user health data
   */
  async saveHealthData(userId: string, healthData: HealthData): Promise<UserHealthProfile> {
    try {
      const query = `
        INSERT INTO user_health_profiles (
          user_id,
          general_health,
          chronic_conditions,
          mobility_level,
          hearing_vision,
          additional_notes,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          general_health = $2,
          chronic_conditions = $3,
          mobility_level = $4,
          hearing_vision = $5,
          additional_notes = $6,
          updated_at = NOW()
        RETURNING *;
      `;

      const result = await this.db.query(query, [
        userId,
        healthData.generalHealth,
        JSON.stringify(healthData.chronicConditions),
        healthData.mobilityLevel,
        JSON.stringify(healthData.hearingVision),
        healthData.additionalNotes || null,
      ]);

      const profile = result.rows[0];
      return this.formatHealthProfile(profile);
    } catch (error) {
      console.error('Error saving health data:', error);
      throw new Error('Failed to save health data');
    }
  }

  /**
   * Get user health profile
   */
  async getHealthData(userId: string): Promise<UserHealthProfile | null> {
    try {
      const query = `
        SELECT * FROM user_health_profiles WHERE user_id = $1;
      `;

      const result = await this.db.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.formatHealthProfile(result.rows[0]);
    } catch (error) {
      console.error('Error getting health data:', error);
      throw new Error('Failed to get health data');
    }
  }

  /**
   * Generate AI context from health data
   * This context is injected into the system prompt for personalized responses
   */
  async generateHealthContext(userId: string): Promise<HealthContext | null> {
    try {
      const healthProfile = await this.getHealthData(userId);

      if (!healthProfile) {
        return null;
      }

      const { healthData } = healthProfile;

      // Build health summary
      const healthSummary = this.buildHealthSummary(healthData);

      // Generate adaptation rules
      const adaptationRules = this.generateAdaptationRules(healthData);

      // Generate communication preferences
      const communicationPreferences = this.generateCommunicationPreferences(healthData);

      // Generate accessibility needs
      const accessibilityNeeds = this.generateAccessibilityNeeds(healthData);

      return {
        healthSummary,
        adaptationRules,
        communicationPreferences,
        accessibilityNeeds,
      };
    } catch (error) {
      console.error('Error generating health context:', error);
      return null;
    }
  }

  /**
   * Build human-readable health summary
   */
  private buildHealthSummary(healthData: HealthData): string {
    const parts: string[] = [];

    if (healthData.generalHealth && healthData.generalHealth !== 'prefer_not') {
      parts.push(`General health: ${this.formatHealthStatus(healthData.generalHealth)}`);
    }

    if (healthData.chronicConditions.length > 0) {
      const conditions = healthData.chronicConditions
        .filter((c) => c !== 'Prefer not to say')
        .join(', ');
      if (conditions) {
        parts.push(`Chronic conditions: ${conditions}`);
      }
    }

    if (healthData.mobilityLevel && healthData.mobilityLevel !== 'prefer_not') {
      parts.push(`Mobility: ${this.formatMobilityLevel(healthData.mobilityLevel)}`);
    }

    if (healthData.hearingVision.length > 0) {
      const hv = healthData.hearingVision
        .filter((h) => h !== 'Prefer not to say')
        .join(', ');
      if (hv) {
        parts.push(`Hearing/Vision: ${hv}`);
      }
    }

    return parts.join(' | ');
  }

  /**
   * Generate adaptation rules for AI to follow
   */
  private generateAdaptationRules(healthData: HealthData): string[] {
    const rules: string[] = [];

    // Mobility adaptations
    if (healthData.mobilityLevel === 'wheelchair') {
      rules.push('When suggesting activities, mention accessible options and wheelchair-friendly alternatives');
      rules.push('Ask about accessibility before suggesting outdoor activities');
    } else if (healthData.mobilityLevel === 'assistance') {
      rules.push('Suggest low-impact activities that can be done with assistance');
      rules.push('Mention adaptive equipment when relevant');
    } else if (healthData.mobilityLevel === 'limited') {
      rules.push('Prioritize activities that can be done from home or with minimal movement');
      rules.push('Suggest virtual or remote alternatives to physical activities');
    }

    // Chronic condition adaptations
    if (healthData.chronicConditions.includes('Arthritis')) {
      rules.push('When suggesting activities, mention adaptive equipment and pain management');
      rules.push('Suggest low-impact exercises and warm water activities');
    }

    if (healthData.chronicConditions.includes('Diabetes')) {
      rules.push('When discussing food or activities, be mindful of diabetes management');
      rules.push('Suggest activities that support healthy lifestyle');
    }

    if (healthData.chronicConditions.includes('Heart condition')) {
      rules.push('Suggest low-stress activities and relaxation techniques');
      rules.push('Avoid suggesting strenuous physical activities');
    }

    if (healthData.chronicConditions.includes('High blood pressure')) {
      rules.push('Suggest stress-reducing activities like meditation or gentle exercise');
      rules.push('Recommend relaxation and breathing exercises');
    }

    if (healthData.chronicConditions.includes('Respiratory/asthma')) {
      rules.push('Suggest indoor activities or activities with good air quality');
      rules.push('Mention air quality when suggesting outdoor activities');
    }

    // Hearing/Vision adaptations
    if (healthData.hearingVision.includes('Hearing aids / Hard of hearing')) {
      rules.push('Offer text-based alternatives to audio content');
      rules.push('Provide captions or transcripts for videos');
    }

    if (healthData.hearingVision.includes('Vision challenges / Glasses needed')) {
      rules.push('Offer audio descriptions of visual content');
      rules.push('Suggest large text or voice-based alternatives');
    }

    // General health adaptations
    if (healthData.generalHealth === 'managing') {
      rules.push('Be empathetic about health challenges');
      rules.push('Suggest activities that are manageable and not overwhelming');
    }

    return rules;
  }

  /**
   * Generate communication preferences based on health data
   */
  private generateCommunicationPreferences(healthData: HealthData): string[] {
    const preferences: string[] = [];

    if (healthData.hearingVision.includes('Hearing aids / Hard of hearing')) {
      preferences.push('Prefer text-based communication');
      preferences.push('Provide written summaries of audio content');
    }

    if (healthData.hearingVision.includes('Vision challenges / Glasses needed')) {
      preferences.push('Prefer voice-based communication');
      preferences.push('Use clear, large text when written communication is necessary');
    }

    if (healthData.hearingVision.includes('Both hearing and vision considerations')) {
      preferences.push('Use multiple communication methods');
      preferences.push('Provide both audio and visual content with alternatives');
    }

    return preferences;
  }

  /**
   * Generate accessibility needs
   */
  private generateAccessibilityNeeds(healthData: HealthData): string[] {
    const needs: string[] = [];

    if (healthData.mobilityLevel === 'wheelchair') {
      needs.push('Wheelchair accessible venues');
      needs.push('Accessible parking');
      needs.push('Accessible restrooms');
    }

    if (healthData.mobilityLevel === 'assistance') {
      needs.push('Seating available');
      needs.push('Assistance available if needed');
      needs.push('Minimal walking required');
    }

    if (healthData.chronicConditions.includes('Arthritis')) {
      needs.push('Ergonomic seating');
      needs.push('Adaptive equipment');
      needs.push('Temperature-controlled environments');
    }

    if (healthData.hearingVision.includes('Hearing aids / Hard of hearing')) {
      needs.push('Quiet environments or hearing loop systems');
      needs.push('Visual alerts');
    }

    if (healthData.hearingVision.includes('Vision challenges / Glasses needed')) {
      needs.push('Good lighting');
      needs.push('Large text or audio descriptions');
    }

    return needs;
  }

  /**
   * Format health status for display
   */
  private formatHealthStatus(status: string): string {
    const statusMap: Record<string, string> = {
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      managing: 'Managing challenges',
      prefer_not: 'Prefer not to say',
    };
    return statusMap[status] || status;
  }

  /**
   * Format mobility level for display
   */
  private formatMobilityLevel(level: string): string {
    const levelMap: Record<string, string> = {
      independent: 'Walk independently',
      assistance: 'Walk with assistance',
      wheelchair: 'Wheelchair',
      limited: 'Limited mobility',
      prefer_not: 'Prefer not to say',
    };
    return levelMap[level] || level;
  }

  /**
   * Format health profile for response
   */
  private formatHealthProfile(dbProfile: any): UserHealthProfile {
    return {
      userId: dbProfile.user_id,
      healthData: {
        generalHealth: dbProfile.general_health,
        chronicConditions: JSON.parse(dbProfile.chronic_conditions || '[]'),
        mobilityLevel: dbProfile.mobility_level,
        hearingVision: JSON.parse(dbProfile.hearing_vision || '[]'),
        additionalNotes: dbProfile.additional_notes,
      },
      createdAt: new Date(dbProfile.created_at),
      updatedAt: new Date(dbProfile.updated_at),
    };
  }

  /**
   * Delete health data (for privacy)
   */
  async deleteHealthData(userId: string): Promise<void> {
    try {
      const query = `
        DELETE FROM user_health_profiles WHERE user_id = $1;
      `;

      await this.db.query(query, [userId]);
    } catch (error) {
      console.error('Error deleting health data:', error);
      throw new Error('Failed to delete health data');
    }
  }

  /**
   * Get health context formatted for AI prompt injection
   */
  async getHealthContextForPrompt(userId: string): Promise<string> {
    try {
      const context = await this.generateHealthContext(userId);

      if (!context) {
        return '';
      }

      const prompt = `
## User Health & Accessibility Context

**Health Summary:** ${context.healthSummary}

**Adaptation Guidelines:**
${context.adaptationRules.map((rule) => `- ${rule}`).join('\n')}

**Communication Preferences:**
${context.communicationPreferences.map((pref) => `- ${pref}`).join('\n')}

**Accessibility Needs:**
${context.accessibilityNeeds.map((need) => `- ${need}`).join('\n')}

When responding, keep these considerations in mind and adapt your suggestions accordingly.
      `;

      return prompt.trim();
    } catch (error) {
      console.error('Error getting health context for prompt:', error);
      return '';
    }
  }
}

export default HealthAwarenessService;
