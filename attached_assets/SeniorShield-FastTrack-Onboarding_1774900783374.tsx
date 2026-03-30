/**
 * SeniorShield Fast-Track Onboarding (2-3 Minutes)
 * 4-screen onboarding flow to get seniors into the app quickly
 * 
 * Screens:
 * 1. Welcome (15 seconds)
 * 2. Name Only (30 seconds)
 * 3. Quick Interests (1 minute)
 * 4. Family Quick Add (1 minute)
 * 
 * Total: 2-3 minutes
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';

interface FamilyMember {
  name: string;
  relationship: 'Son' | 'Daughter' | 'Grandchild' | 'Other';
}

interface OnboardingData {
  name: string;
  interests: string[];
  familyMembers: FamilyMember[];
}

interface FastTrackOnboardingProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

// Screen 1: Welcome
const WelcomeScreen: React.FC<{
  onContinue: () => void;
  onSkip: () => void;
}> = ({ onContinue, onSkip }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to SeniorShield!</Text>
          <Text style={styles.subtitle}>
            Your AI companion for tech guidance, scam detection, and friendly conversation.
          </Text>
          <Text style={styles.description}>
            Let's get you started in just 2-3 minutes.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onContinue}
          >
            <Text style={styles.buttonText}>Let's Go</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onSkip}
          >
            <Text style={styles.secondaryButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Screen 2: Name
const NameScreen: React.FC<{
  onNext: (name: string) => void;
  onBack: () => void;
}> = ({ onNext, onBack }) => {
  const [name, setName] = useState('');

  const handleNext = () => {
    if (name.trim()) {
      onNext(name);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screen}>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '25%' }]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.stepLabel}>Step 1 of 3</Text>
          <Text style={styles.title}>What's your name?</Text>
          <Text style={styles.description}>
            We'd love to know who we're talking to!
          </Text>

          <TextInput
            style={styles.textInput}
            placeholder="Enter your name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleNext}
            disabled={!name.trim()}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onBack}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Screen 3: Interests
const InterestsScreen: React.FC<{
  onNext: (interests: string[]) => void;
  onBack: () => void;
}> = ({ onNext, onBack }) => {
  const interestOptions = [
    'Gardening',
    'Sports',
    'Reading',
    'Cooking',
    'Travel',
    'Movies',
    'Music',
    'Family',
  ];

  const [selected, setSelected] = useState<string[]>([]);

  const toggleInterest = (interest: string) => {
    if (selected.includes(interest)) {
      setSelected(selected.filter((i) => i !== interest));
    } else if (selected.length < 3) {
      setSelected([...selected, interest]);
    }
  };

  const handleNext = () => {
    onNext(selected);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.screen}>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '50%' }]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.stepLabel}>Step 2 of 3</Text>
          <Text style={styles.title}>What do you enjoy?</Text>
          <Text style={styles.description}>Pick up to 3 interests</Text>

          <View style={styles.interestsGrid}>
            {interestOptions.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestButton,
                  selected.includes(interest) && styles.interestButtonSelected,
                ]}
                onPress={() => toggleInterest(interest)}
              >
                <Text
                  style={[
                    styles.interestButtonText,
                    selected.includes(interest) &&
                      styles.interestButtonTextSelected,
                  ]}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleNext}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onBack}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Screen 4: Family
const FamilyScreen: React.FC<{
  onComplete: (family: FamilyMember[]) => void;
  onBack: () => void;
}> = ({ onComplete, onBack }) => {
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [currentName, setCurrentName] = useState('');
  const [currentRelationship, setCurrentRelationship] = useState<
    'Son' | 'Daughter' | 'Grandchild' | 'Other'
  >('Son');

  const relationships: Array<'Son' | 'Daughter' | 'Grandchild' | 'Other'> = [
    'Son',
    'Daughter',
    'Grandchild',
    'Other',
  ];

  const addFamilyMember = () => {
    if (currentName.trim()) {
      setFamily([...family, { name: currentName, relationship: currentRelationship }]);
      setCurrentName('');
      setCurrentRelationship('Son');
    }
  };

  const removeFamilyMember = (index: number) => {
    setFamily(family.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    onComplete(family);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.screen}>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '75%' }]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.stepLabel}>Step 3 of 3</Text>
          <Text style={styles.title}>Any family members we should know about?</Text>
          <Text style={styles.description}>
            This helps us have more personal conversations with you.
          </Text>

          {/* Family Members List */}
          {family.length > 0 && (
            <View style={styles.familyList}>
              {family.map((member, index) => (
                <View key={index} style={styles.familyMemberCard}>
                  <View>
                    <Text style={styles.familyMemberName}>{member.name}</Text>
                    <Text style={styles.familyMemberRelationship}>
                      {member.relationship}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeFamilyMember(index)}>
                    <Text style={styles.removeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Add Family Member Form */}
          {family.length < 2 && (
            <View style={styles.addFamilyForm}>
              <TextInput
                style={styles.textInput}
                placeholder="Family member name"
                placeholderTextColor="#999"
                value={currentName}
                onChangeText={setCurrentName}
              />

              <View style={styles.relationshipSelector}>
                {relationships.map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    style={[
                      styles.relationshipOption,
                      currentRelationship === rel &&
                        styles.relationshipOptionSelected,
                    ]}
                    onPress={() => setCurrentRelationship(rel)}
                  >
                    <Text
                      style={[
                        styles.relationshipOptionText,
                        currentRelationship === rel &&
                          styles.relationshipOptionTextSelected,
                      ]}
                    >
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={addFamilyMember}
                disabled={!currentName.trim()}
              >
                <Text style={styles.secondaryButtonText}>+ Add Family Member</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleComplete}
          >
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onBack}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Main Onboarding Component
export const FastTrackOnboarding: React.FC<FastTrackOnboardingProps> = ({
  onComplete,
  onSkip,
}) => {
  const [screen, setScreen] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleWelcomeSkip = () => {
    onSkip();
  };

  const handleWelcomeContinue = () => {
    setScreen(2);
  };

  const handleNameNext = (inputName: string) => {
    setName(inputName);
    setScreen(3);
  };

  const handleInterestsNext = (selectedInterests: string[]) => {
    setInterests(selectedInterests);
    setScreen(4);
  };

  const handleFamilyComplete = (familyMembers: FamilyMember[]) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      onComplete({
        name,
        interests,
        familyMembers,
      });
      setIsLoading(false);
    }, 500);
  };

  const handleBack = () => {
    if (screen > 1) {
      setScreen((screen - 1) as 1 | 2 | 3 | 4);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.screen, styles.centerContent]}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Setting up your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  switch (screen) {
    case 1:
      return (
        <WelcomeScreen
          onContinue={handleWelcomeContinue}
          onSkip={handleWelcomeSkip}
        />
      );
    case 2:
      return (
        <NameScreen onNext={handleNameNext} onBack={handleBack} />
      );
    case 3:
      return (
        <InterestsScreen onNext={handleInterestsNext} onBack={handleBack} />
      );
    case 4:
      return (
        <FamilyScreen onComplete={handleFamilyComplete} onBack={handleBack} />
      );
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  screen: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 30,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#0066cc',
  },
  content: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#333',
    marginBottom: 16,
    lineHeight: 24,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  interestButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  interestButtonSelected: {
    borderColor: '#0066cc',
    backgroundColor: '#e6f0ff',
  },
  interestButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  interestButtonTextSelected: {
    color: '#0066cc',
  },
  familyList: {
    marginBottom: 20,
  },
  familyMemberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  familyMemberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  familyMemberRelationship: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  removeButton: {
    fontSize: 20,
    color: '#999',
    fontWeight: 'bold',
  },
  addFamilyForm: {
    marginBottom: 20,
  },
  relationshipSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  relationshipOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  relationshipOptionSelected: {
    borderColor: '#0066cc',
    backgroundColor: '#e6f0ff',
  },
  relationshipOptionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  relationshipOptionTextSelected: {
    color: '#0066cc',
  },
  buttonContainer: {
    gap: 10,
    marginTop: 20,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#0066cc',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});

export default FastTrackOnboarding;
