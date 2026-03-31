/**
 * SeniorShield Health Awareness Onboarding Module
 * Optional health and accessibility questions to personalize AI responses
 * 
 * Screens:
 * 1. Health Awareness Intro (15 seconds)
 * 2. General Health Status (30 seconds)
 * 3. Chronic Conditions (1 minute)
 * 4. Mobility Level (30 seconds)
 * 5. Hearing/Vision Considerations (1 minute)
 * 
 * Total: 3-4 minutes (optional, can be skipped)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  CheckBox,
} from 'react-native';

interface HealthData {
  generalHealth: string;
  chronicConditions: string[];
  mobilityLevel: string;
  hearingVision: string[];
  additionalNotes?: string;
}

interface HealthAwarenessProps {
  onComplete: (data: HealthData) => void;
  onSkip: () => void;
  onBack: () => void;
}

// Screen 1: Health Awareness Intro
const HealthAwarenessIntroScreen: React.FC<{
  onContinue: () => void;
  onSkip: () => void;
}> = ({ onContinue, onSkip }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.title}>Help Us Understand You Better</Text>
          <Text style={styles.subtitle}>
            A few optional questions about your health and accessibility needs
          </Text>
          <Text style={styles.description}>
            This helps our AI companion give you more personalized and relevant suggestions. For example, if you mention wanting to go to the beach, we can suggest accessible options if you need them.
          </Text>
          <Text style={styles.privacyNote}>
            💡 All information is optional. You can skip any question or say "prefer not to say."
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onContinue}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onSkip}
          >
            <Text style={styles.secondaryButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Screen 2: General Health Status
const GeneralHealthScreen: React.FC<{
  onNext: (health: string) => void;
  onBack: () => void;
  onSkip: () => void;
}> = ({ onNext, onBack, onSkip }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const options = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'managing', label: 'Managing challenges' },
    { value: 'prefer_not', label: 'Prefer not to say' },
  ];

  const handleNext = () => {
    if (selected) {
      onNext(selected);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screen}>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '20%' }]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.stepLabel}>Step 1 of 4</Text>
          <Text style={styles.title}>How would you describe your overall health?</Text>
          <Text style={styles.description}>
            This helps us give you suggestions that work for your situation.
          </Text>

          <View style={styles.optionsContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  selected === option.value && styles.optionButtonSelected,
                ]}
                onPress={() => setSelected(option.value)}
              >
                <View
                  style={[
                    styles.radioButton,
                    selected === option.value && styles.radioButtonSelected,
                  ]}
                />
                <Text
                  style={[
                    styles.optionText,
                    selected === option.value && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleNext}
            disabled={!selected}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { flex: 1 }]}
              onPress={onBack}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { flex: 1, marginLeft: 10 }]}
              onPress={onSkip}
            >
              <Text style={styles.secondaryButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Screen 3: Chronic Conditions
const ChronicConditionsScreen: React.FC<{
  onNext: (conditions: string[]) => void;
  onBack: () => void;
  onSkip: () => void;
}> = ({ onNext, onBack, onSkip }) => {
  const [selected, setSelected] = useState<string[]>([]);

  const conditions = [
    'Arthritis',
    'Diabetes',
    'Heart condition',
    'High blood pressure',
    'Respiratory/asthma',
    'Mobility issues',
    'Other',
    'Prefer not to say',
  ];

  const toggleCondition = (condition: string) => {
    if (selected.includes(condition)) {
      setSelected(selected.filter((c) => c !== condition));
    } else {
      setSelected([...selected, condition]);
    }
  };

  const handleNext = () => {
    onNext(selected);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.screen}>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '40%' }]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.stepLabel}>Step 2 of 4</Text>
          <Text style={styles.title}>Any chronic conditions?</Text>
          <Text style={styles.description}>
            Select all that apply. This helps us suggest activities that work for you.
          </Text>

          <View style={styles.checkboxContainer}>
            {conditions.map((condition) => (
              <TouchableOpacity
                key={condition}
                style={styles.checkboxRow}
                onPress={() => toggleCondition(condition)}
              >
                <View
                  style={[
                    styles.checkbox,
                    selected.includes(condition) && styles.checkboxSelected,
                  ]}
                >
                  {selected.includes(condition) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{condition}</Text>
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

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { flex: 1 }]}
              onPress={onBack}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { flex: 1, marginLeft: 10 }]}
              onPress={onSkip}
            >
              <Text style={styles.secondaryButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Screen 4: Mobility Level
const MobilityLevelScreen: React.FC<{
  onNext: (mobility: string) => void;
  onBack: () => void;
  onSkip: () => void;
}> = ({ onNext, onBack, onSkip }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const options = [
    { value: 'independent', label: 'Walk independently' },
    { value: 'assistance', label: 'Walk with assistance (cane, walker)' },
    { value: 'wheelchair', label: 'Wheelchair' },
    { value: 'limited', label: 'Limited mobility' },
    { value: 'prefer_not', label: 'Prefer not to say' },
  ];

  const handleNext = () => {
    if (selected) {
      onNext(selected);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screen}>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '60%' }]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.stepLabel}>Step 3 of 4</Text>
          <Text style={styles.title}>How do you get around?</Text>
          <Text style={styles.description}>
            This helps us suggest activities that are accessible for you.
          </Text>

          <View style={styles.optionsContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  selected === option.value && styles.optionButtonSelected,
                ]}
                onPress={() => setSelected(option.value)}
              >
                <View
                  style={[
                    styles.radioButton,
                    selected === option.value && styles.radioButtonSelected,
                  ]}
                />
                <Text
                  style={[
                    styles.optionText,
                    selected === option.value && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleNext}
            disabled={!selected}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { flex: 1 }]}
              onPress={onBack}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { flex: 1, marginLeft: 10 }]}
              onPress={onSkip}
            >
              <Text style={styles.secondaryButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Screen 5: Hearing/Vision
const HearingVisionScreen: React.FC<{
  onComplete: (hearingVision: string[]) => void;
  onBack: () => void;
}> = ({ onComplete, onBack }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const options = [
    'Hearing aids / Hard of hearing',
    'Vision challenges / Glasses needed',
    'Both hearing and vision considerations',
    'Neither',
    'Prefer not to say',
  ];

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      setSelected(selected.filter((o) => o !== option));
    } else {
      setSelected([...selected, option]);
    }
  };

  const handleComplete = () => {
    setIsLoading(true);
    setTimeout(() => {
      onComplete(selected);
      setIsLoading(false);
    }, 500);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.screen, styles.centerContent]}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Saving your health information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.screen}>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '100%' }]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.stepLabel}>Step 4 of 4</Text>
          <Text style={styles.title}>Hearing or vision considerations?</Text>
          <Text style={styles.description}>
            Select all that apply. This helps us communicate in the best way for you.
          </Text>

          <View style={styles.checkboxContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.checkboxRow}
                onPress={() => toggleOption(option)}
              >
                <View
                  style={[
                    styles.checkbox,
                    selected.includes(option) && styles.checkboxSelected,
                  ]}
                >
                  {selected.includes(option) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleComplete}
          >
            <Text style={styles.buttonText}>Complete</Text>
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

// Main Health Awareness Component
export const HealthAwarenessOnboarding: React.FC<HealthAwarenessProps> = ({
  onComplete,
  onSkip,
  onBack,
}) => {
  const [screen, setScreen] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [generalHealth, setGeneralHealth] = useState('');
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [mobilityLevel, setMobilityLevel] = useState('');
  const [hearingVision, setHearingVision] = useState<string[]>([]);

  const handleIntroSkip = () => {
    onSkip();
  };

  const handleIntroContinue = () => {
    setScreen(2);
  };

  const handleHealthNext = (health: string) => {
    setGeneralHealth(health);
    setScreen(3);
  };

  const handleConditionsNext = (conditions: string[]) => {
    setChronicConditions(conditions);
    setScreen(4);
  };

  const handleMobilityNext = (mobility: string) => {
    setMobilityLevel(mobility);
    setScreen(5);
  };

  const handleHearingVisionComplete = (hv: string[]) => {
    setHearingVision(hv);
    onComplete({
      generalHealth,
      chronicConditions,
      mobilityLevel,
      hearingVision: hv,
    });
  };

  const handleBack = () => {
    if (screen > 1) {
      setScreen((screen - 1) as 1 | 2 | 3 | 4 | 5);
    } else {
      onBack();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  switch (screen) {
    case 1:
      return (
        <HealthAwarenessIntroScreen
          onContinue={handleIntroContinue}
          onSkip={handleIntroSkip}
        />
      );
    case 2:
      return (
        <GeneralHealthScreen
          onNext={handleHealthNext}
          onBack={handleBack}
          onSkip={handleSkip}
        />
      );
    case 3:
      return (
        <ChronicConditionsScreen
          onNext={handleConditionsNext}
          onBack={handleBack}
          onSkip={handleSkip}
        />
      );
    case 4:
      return (
        <MobilityLevelScreen
          onNext={handleMobilityNext}
          onBack={handleBack}
          onSkip={handleSkip}
        />
      );
    case 5:
      return (
        <HearingVisionScreen
          onComplete={handleHearingVisionComplete}
          onBack={handleBack}
        />
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
  privacyNote: {
    fontSize: 14,
    color: '#0066cc',
    backgroundColor: '#e6f0ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  optionButtonSelected: {
    borderColor: '#0066cc',
    backgroundColor: '#e6f0ff',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: '#0066cc',
    backgroundColor: '#0066cc',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#0066cc',
  },
  checkboxContainer: {
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: '#0066cc',
    backgroundColor: '#0066cc',
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 10,
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
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

export default HealthAwarenessOnboarding;
