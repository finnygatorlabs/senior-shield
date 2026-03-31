/**
 * SeniorShield Adaptation Rules Engine
 * Provides intelligent adaptation rules and alternative suggestions based on health data
 */

interface HealthData {
  generalHealth: string;
  chronicConditions: string[];
  mobilityLevel: string;
  hearingVision: string[];
}

interface AdaptationRule {
  condition: string;
  rule: string;
  priority: number;
}

interface AlternativeSuggestion {
  original: string;
  alternatives: string[];
  reason: string;
}

class AdaptationRulesEngine {
  /**
   * Get all applicable adaptation rules for a user
   */
  static getAdaptationRules(healthData: HealthData): AdaptationRule[] {
    const rules: AdaptationRule[] = [];

    // Mobility-based rules
    if (healthData.mobilityLevel === 'wheelchair') {
      rules.push({
        condition: 'Wheelchair user',
        rule: 'Always mention wheelchair accessibility when suggesting venues or activities',
        priority: 10,
      });
      rules.push({
        condition: 'Wheelchair user',
        rule: 'Ask about accessibility before suggesting outdoor activities',
        priority: 9,
      });
      rules.push({
        condition: 'Wheelchair user',
        rule: 'Suggest accessible alternatives (virtual tours, delivery services, etc.)',
        priority: 8,
      });
    }

    if (healthData.mobilityLevel === 'assistance') {
      rules.push({
        condition: 'Uses mobility assistance',
        rule: 'Suggest low-impact activities that can be done with assistance',
        priority: 9,
      });
      rules.push({
        condition: 'Uses mobility assistance',
        rule: 'Mention adaptive equipment and aids when relevant',
        priority: 8,
      });
      rules.push({
        condition: 'Uses mobility assistance',
        rule: 'Ask if they need help or assistance before suggesting activities',
        priority: 7,
      });
    }

    if (healthData.mobilityLevel === 'limited') {
      rules.push({
        condition: 'Limited mobility',
        rule: 'Prioritize activities that can be done from home',
        priority: 9,
      });
      rules.push({
        condition: 'Limited mobility',
        rule: 'Suggest virtual or remote alternatives to physical activities',
        priority: 8,
      });
      rules.push({
        condition: 'Limited mobility',
        rule: 'Recommend gentle exercises and relaxation techniques',
        priority: 7,
      });
    }

    // Chronic condition rules
    if (healthData.chronicConditions.includes('Arthritis')) {
      rules.push({
        condition: 'Arthritis',
        rule: 'When suggesting activities, mention adaptive equipment and pain management',
        priority: 9,
      });
      rules.push({
        condition: 'Arthritis',
        rule: 'Suggest low-impact exercises like swimming or water aerobics',
        priority: 8,
      });
      rules.push({
        condition: 'Arthritis',
        rule: 'Recommend warm environments and avoid cold exposure',
        priority: 7,
      });
    }

    if (healthData.chronicConditions.includes('Diabetes')) {
      rules.push({
        condition: 'Diabetes',
        rule: 'When discussing food or activities, be mindful of diabetes management',
        priority: 9,
      });
      rules.push({
        condition: 'Diabetes',
        rule: 'Suggest activities that support healthy lifestyle and blood sugar management',
        priority: 8,
      });
      rules.push({
        condition: 'Diabetes',
        rule: 'Recommend regular activity and monitoring',
        priority: 7,
      });
    }

    if (healthData.chronicConditions.includes('Heart condition')) {
      rules.push({
        condition: 'Heart condition',
        rule: 'Suggest low-stress activities and relaxation techniques',
        priority: 10,
      });
      rules.push({
        condition: 'Heart condition',
        rule: 'Avoid suggesting strenuous physical activities',
        priority: 10,
      });
      rules.push({
        condition: 'Heart condition',
        rule: 'Recommend meditation, breathing exercises, and gentle movement',
        priority: 8,
      });
    }

    if (healthData.chronicConditions.includes('High blood pressure')) {
      rules.push({
        condition: 'High blood pressure',
        rule: 'Suggest stress-reducing activities like meditation or gentle exercise',
        priority: 9,
      });
      rules.push({
        condition: 'High blood pressure',
        rule: 'Recommend relaxation and breathing exercises',
        priority: 8,
      });
      rules.push({
        condition: 'High blood pressure',
        rule: 'Avoid suggesting high-stress or competitive activities',
        priority: 8,
      });
    }

    if (healthData.chronicConditions.includes('Respiratory/asthma')) {
      rules.push({
        condition: 'Respiratory/asthma',
        rule: 'Suggest indoor activities or activities with good air quality',
        priority: 9,
      });
      rules.push({
        condition: 'Respiratory/asthma',
        rule: 'Mention air quality when suggesting outdoor activities',
        priority: 8,
      });
      rules.push({
        condition: 'Respiratory/asthma',
        rule: 'Recommend breathing exercises and air purification',
        priority: 7,
      });
    }

    if (healthData.chronicConditions.includes('Mobility issues')) {
      rules.push({
        condition: 'Mobility issues',
        rule: 'Suggest accessible transportation options',
        priority: 9,
      });
      rules.push({
        condition: 'Mobility issues',
        rule: 'Recommend home-based activities and services',
        priority: 8,
      });
    }

    // Hearing/Vision rules
    if (healthData.hearingVision.includes('Hearing aids / Hard of hearing')) {
      rules.push({
        condition: 'Hard of hearing',
        rule: 'Offer text-based alternatives to audio content',
        priority: 9,
      });
      rules.push({
        condition: 'Hard of hearing',
        rule: 'Provide captions or transcripts for videos',
        priority: 9,
      });
      rules.push({
        condition: 'Hard of hearing',
        rule: 'Use clear, simple language in written communication',
        priority: 8,
      });
    }

    if (healthData.hearingVision.includes('Vision challenges / Glasses needed')) {
      rules.push({
        condition: 'Vision challenges',
        rule: 'Offer audio descriptions of visual content',
        priority: 9,
      });
      rules.push({
        condition: 'Vision challenges',
        rule: 'Suggest large text or voice-based alternatives',
        priority: 9,
      });
      rules.push({
        condition: 'Vision challenges',
        rule: 'Recommend good lighting and high contrast',
        priority: 8,
      });
    }

    if (healthData.hearingVision.includes('Both hearing and vision considerations')) {
      rules.push({
        condition: 'Hearing and vision challenges',
        rule: 'Use multiple communication methods (audio + visual + text)',
        priority: 10,
      });
      rules.push({
        condition: 'Hearing and vision challenges',
        rule: 'Provide redundant information in different formats',
        priority: 10,
      });
    }

    // General health rules
    if (healthData.generalHealth === 'managing') {
      rules.push({
        condition: 'Managing health challenges',
        rule: 'Be empathetic about health challenges',
        priority: 8,
      });
      rules.push({
        condition: 'Managing health challenges',
        rule: 'Suggest activities that are manageable and not overwhelming',
        priority: 8,
      });
    }

    return rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get alternative suggestions based on health data
   */
  static getAlternativeSuggestions(
    originalSuggestion: string,
    healthData: HealthData
  ): AlternativeSuggestion[] {
    const suggestions: AlternativeSuggestion[] = [];

    // Beach activity alternatives
    if (originalSuggestion.toLowerCase().includes('beach')) {
      if (healthData.mobilityLevel === 'wheelchair') {
        suggestions.push({
          original: 'Go to the beach',
          alternatives: [
            'Visit an accessible beach with wheelchair ramps and accessible parking',
            'Enjoy a virtual beach experience or beach videos',
            'Listen to ocean sounds and beach ambience',
            'Visit a beach gift shop or seafood restaurant',
          ],
          reason: 'Wheelchair accessibility considerations',
        });
      }

      if (healthData.chronicConditions.includes('Respiratory/asthma')) {
        suggestions.push({
          original: 'Go to the beach',
          alternatives: [
            'Check air quality before going to the beach',
            'Visit during low pollen times',
            'Enjoy a beach video or virtual tour instead',
            'Visit an indoor aquarium',
          ],
          reason: 'Air quality and respiratory health',
        });
      }

      if (healthData.hearingVision.includes('Vision challenges / Glasses needed')) {
        suggestions.push({
          original: 'Go to the beach',
          alternatives: [
            'Listen to beach sounds and descriptions',
            'Visit during daytime with good lighting',
            'Bring a companion to describe the scenery',
            'Use audio guides for beach activities',
          ],
          reason: 'Vision accessibility',
        });
      }
    }

    // Hiking alternatives
    if (originalSuggestion.toLowerCase().includes('hike')) {
      if (healthData.mobilityLevel === 'wheelchair' || healthData.mobilityLevel === 'limited') {
        suggestions.push({
          original: 'Go hiking',
          alternatives: [
            'Visit a nature center with accessible trails',
            'Take a scenic drive through nature',
            'Watch nature documentaries',
            'Visit a botanical garden with accessible paths',
          ],
          reason: 'Mobility accessibility',
        });
      }

      if (healthData.chronicConditions.includes('Heart condition')) {
        suggestions.push({
          original: 'Go hiking',
          alternatives: [
            'Take a gentle nature walk on flat terrain',
            'Visit a botanical garden',
            'Enjoy nature photography from home',
            'Watch nature documentaries',
          ],
          reason: 'Heart health considerations',
        });
      }
    }

    // Sports alternatives
    if (originalSuggestion.toLowerCase().includes('sport') || originalSuggestion.toLowerCase().includes('game')) {
      if (healthData.chronicConditions.includes('Arthritis')) {
        suggestions.push({
          original: 'Play sports',
          alternatives: [
            'Try adapted sports (wheelchair basketball, sitting volleyball)',
            'Watch sports and analyze strategy',
            'Play strategy games or board games',
            'Enjoy sports commentary and discussion',
          ],
          reason: 'Arthritis considerations',
        });
      }

      if (healthData.chronicConditions.includes('Heart condition')) {
        suggestions.push({
          original: 'Play sports',
          alternatives: [
            'Watch sports and enjoy the entertainment',
            'Play low-intensity games like golf or bowling',
            'Participate in gentle group activities',
            'Discuss sports strategy and history',
          ],
          reason: 'Heart health - avoid strenuous activity',
        });
      }
    }

    // Cooking alternatives
    if (originalSuggestion.toLowerCase().includes('cook')) {
      if (healthData.chronicConditions.includes('Arthritis')) {
        suggestions.push({
          original: 'Cook a meal',
          alternatives: [
            'Use adaptive kitchen equipment (ergonomic tools, easy-grip utensils)',
            'Cook simpler meals that require less hand movement',
            'Use meal delivery services',
            'Watch cooking shows and enjoy the experience',
          ],
          reason: 'Arthritis - hand and joint considerations',
        });
      }

      if (healthData.chronicConditions.includes('Diabetes')) {
        suggestions.push({
          original: 'Cook a meal',
          alternatives: [
            'Cook diabetes-friendly recipes',
            'Use meal planning services',
            'Learn about healthy cooking techniques',
            'Watch cooking shows focused on healthy meals',
          ],
          reason: 'Diabetes - nutrition management',
        });
      }
    }

    // Reading alternatives
    if (originalSuggestion.toLowerCase().includes('read')) {
      if (healthData.hearingVision.includes('Vision challenges / Glasses needed')) {
        suggestions.push({
          original: 'Read a book',
          alternatives: [
            'Listen to audiobooks',
            'Use e-readers with adjustable font sizes',
            'Use text-to-speech software',
            'Attend book clubs or discussion groups',
          ],
          reason: 'Vision accessibility',
        });
      }
    }

    return suggestions;
  }

  /**
   * Generate empathetic response template based on health data
   */
  static getResponseTemplate(healthData: HealthData): string {
    let template = '';

    if (healthData.generalHealth === 'managing') {
      template = `I understand managing health can be challenging. Here are some options that might work for you:`;
    } else if (healthData.mobilityLevel === 'wheelchair') {
      template = `I want to make sure we find options that work for you. Here are some accessible alternatives:`;
    } else if (healthData.chronicConditions.length > 0) {
      template = `Taking your health into account, here are some suggestions that might be a good fit:`;
    } else if (healthData.hearingVision.length > 0) {
      template = `To make sure you can enjoy this, here are some options with different formats:`;
    } else {
      template = `Here are some great options for you:`;
    }

    return template;
  }

  /**
   * Check if suggestion is appropriate for health data
   */
  static isSuggestionAppropriate(suggestion: string, healthData: HealthData): boolean {
    const lowerSuggestion = suggestion.toLowerCase();

    // Check for inappropriate suggestions based on health data
    if (healthData.chronicConditions.includes('Heart condition')) {
      if (lowerSuggestion.includes('strenuous') || lowerSuggestion.includes('intense exercise')) {
        return false;
      }
    }

    if (healthData.mobilityLevel === 'wheelchair') {
      if (lowerSuggestion.includes('climbing') || lowerSuggestion.includes('stairs')) {
        return false;
      }
    }

    if (healthData.chronicConditions.includes('Respiratory/asthma')) {
      if (lowerSuggestion.includes('high pollen') || lowerSuggestion.includes('poor air quality')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get communication style based on health data
   */
  static getCommunicationStyle(healthData: HealthData): string {
    if (healthData.hearingVision.includes('Hearing aids / Hard of hearing')) {
      return 'text-based with clear written communication';
    }

    if (healthData.hearingVision.includes('Vision challenges / Glasses needed')) {
      return 'voice-based with audio descriptions';
    }

    if (healthData.generalHealth === 'managing') {
      return 'empathetic and supportive with manageable suggestions';
    }

    return 'conversational and friendly';
  }

  /**
   * Get accessibility features to enable
   */
  static getAccessibilityFeatures(healthData: HealthData): string[] {
    const features: string[] = [];

    if (healthData.hearingVision.includes('Vision challenges / Glasses needed')) {
      features.push('large_text');
      features.push('high_contrast');
      features.push('audio_descriptions');
    }

    if (healthData.hearingVision.includes('Hearing aids / Hard of hearing')) {
      features.push('captions');
      features.push('transcripts');
      features.push('visual_alerts');
    }

    if (healthData.mobilityLevel === 'wheelchair' || healthData.mobilityLevel === 'limited') {
      features.push('voice_commands');
      features.push('simplified_navigation');
    }

    if (healthData.chronicConditions.includes('Arthritis')) {
      features.push('large_touch_targets');
      features.push('voice_commands');
    }

    return features;
  }
}

export default AdaptationRulesEngine;
