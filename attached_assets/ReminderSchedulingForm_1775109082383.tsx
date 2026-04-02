/**
 * Senior-Friendly Reminder Scheduling Form
 * 
 * Design principles:
 * - Large, legible fonts (18pt+)
 * - High contrast (dark text on light backgrounds)
 * - Warm, approachable color palette
 * - Clear visual hierarchy
 * - Large touch targets (easy to tap)
 * - Simple, uncluttered layout
 * - Friendly, encouraging language
 * - Visual feedback and confirmation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

// Color palette - warm, calming, senior-friendly
const COLORS = {
  primary: '#4A90E2',        // Calm blue
  secondary: '#7ED321',      // Soft green
  accent: '#F5A623',         // Warm orange
  background: '#F8F9FA',     // Very light gray
  surface: '#FFFFFF',        // White
  text: '#2C3E50',           // Dark blue-gray
  textLight: '#7F8C8D',      // Medium gray
  border: '#E1E8ED',         // Light gray
  success: '#27AE60',        // Green
  error: '#E74C3C',          // Red
  disabled: '#BDC3C7',       // Light gray
};

const REMINDER_TYPES = [
  { id: 'medication', label: 'Medication', icon: 'pill', emoji: '💊' },
  { id: 'water', label: 'Drink Water', icon: 'water', emoji: '💧' },
  { id: 'meal', label: 'Meal Time', icon: 'restaurant', emoji: '🍽️' },
  { id: 'appointment', label: 'Appointment', icon: 'calendar', emoji: '📅' },
  { id: 'wellness', label: 'Wellness Check', icon: 'heart', emoji: '❤️' },
  { id: 'custom', label: 'Custom', icon: 'create', emoji: '✏️' },
];

const FREQUENCY_OPTIONS = [
  { id: 'once', label: 'One Time Only' },
  { id: 'daily', label: 'Every Day' },
  { id: 'weekly', label: 'Specific Days' },
];

const DAYS_OF_WEEK = [
  { id: 0, label: 'Sun', short: 'S' },
  { id: 1, label: 'Mon', short: 'M' },
  { id: 2, label: 'Tue', short: 'T' },
  { id: 3, label: 'Wed', short: 'W' },
  { id: 4, label: 'Thu', short: 'T' },
  { id: 5, label: 'Fri', short: 'F' },
  { id: 6, label: 'Sat', short: 'S' },
];

interface ReminderFormData {
  reminderType: string;
  customName?: string;
  scheduledTime: Date;
  frequency: string;
  daysOfWeek: number[];
  description: string;
  duration: 'once' | 'daily' | 'ongoing';
  durationDays?: number;
  notifyFamilyMember: boolean;
  familyMemberId?: string;
}

interface ReminderSchedulingFormProps {
  onSubmit: (data: ReminderFormData) => Promise<void>;
  familyMembers?: Array<{ id: string; name: string; email: string }>;
  isAdmin: boolean;
}

export const ReminderSchedulingForm: React.FC<ReminderSchedulingFormProps> = ({
  onSubmit,
  familyMembers = [],
  isAdmin,
}) => {
  const [formData, setFormData] = useState<ReminderFormData>({
    reminderType: 'medication',
    scheduledTime: new Date(),
    frequency: 'daily',
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri by default
    description: '',
    duration: 'ongoing',
    notifyFamilyMember: true,
  });

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.errorBox}>
          <Ionicons name="lock-closed" size={48} color={COLORS.error} />
          <Text style={styles.errorTitle}>Admin Access Required</Text>
          <Text style={styles.errorMessage}>
            Only administrators can create reminders.
          </Text>
        </View>
      </View>
    );
  }

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setFormData({ ...formData, scheduledTime: selectedDate });
    }
  };

  const toggleDayOfWeek = (dayId: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(dayId)
        ? prev.daysOfWeek.filter(d => d !== dayId)
        : [...prev.daysOfWeek, dayId].sort(),
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.reminderType) {
      Alert.alert('Please select a reminder type');
      return;
    }

    if (formData.reminderType === 'custom' && !formData.customName?.trim()) {
      Alert.alert('Please enter a custom reminder name');
      return;
    }

    if (formData.frequency === 'weekly' && formData.daysOfWeek.length === 0) {
      Alert.alert('Please select at least one day of the week');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('Please enter a description or instructions');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        // Reset form
        setFormData({
          reminderType: 'medication',
          scheduledTime: new Date(),
          frequency: 'daily',
          daysOfWeek: [1, 2, 3, 4, 5],
          description: '',
          duration: 'ongoing',
          notifyFamilyMember: true,
        });
      }, 2000);
    } catch (error) {
      Alert.alert('Error', `Failed to create reminder: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedReminderType = REMINDER_TYPES.find(
    t => t.id === formData.reminderType
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="notifications" size={40} color={COLORS.primary} />
        <Text style={styles.headerTitle}>Create a Reminder</Text>
        <Text style={styles.headerSubtitle}>
          Set up a helpful reminder for daily tasks
        </Text>
      </View>

      {/* Reminder Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>What do you want to remember?</Text>
        <View style={styles.typeGrid}>
          {REMINDER_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeButton,
                formData.reminderType === type.id && styles.typeButtonActive,
              ]}
              onPress={() =>
                setFormData({ ...formData, reminderType: type.id })
              }
            >
              <Text style={styles.typeEmoji}>{type.emoji}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  formData.reminderType === type.id &&
                    styles.typeLabelActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Custom Name Input (if custom selected) */}
      {formData.reminderType === 'custom' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Custom Reminder Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Take vitamins, Call doctor"
            placeholderTextColor={COLORS.textLight}
            value={formData.customName}
            onChangeText={text =>
              setFormData({ ...formData, customName: text })
            }
          />
        </View>
      )}

      {/* Time Picker */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>What time?</Text>
        <TouchableOpacity
          style={styles.timePickerButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons name="time" size={24} color={COLORS.primary} />
          <Text style={styles.timePickerText}>
            {formData.scheduledTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </Text>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
        </TouchableOpacity>

        {showTimePicker && (
          <>
            <DateTimePicker
              value={formData.scheduledTime}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.timePickerDone}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.timePickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Frequency Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>How often?</Text>
        {FREQUENCY_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.radioButton,
              formData.frequency === option.id && styles.radioButtonActive,
            ]}
            onPress={() =>
              setFormData({ ...formData, frequency: option.id })
            }
          >
            <View
              style={[
                styles.radioCircle,
                formData.frequency === option.id &&
                  styles.radioCircleActive,
              ]}
            >
              {formData.frequency === option.id && (
                <View style={styles.radioCircleDot} />
              )}
            </View>
            <Text style={styles.radioLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Days of Week (if weekly selected) */}
      {formData.frequency === 'weekly' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Which days?</Text>
          <View style={styles.daysGrid}>
            {DAYS_OF_WEEK.map(day => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayButton,
                  formData.daysOfWeek.includes(day.id) &&
                    styles.dayButtonActive,
                ]}
                onPress={() => toggleDayOfWeek(day.id)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    formData.daysOfWeek.includes(day.id) &&
                      styles.dayButtonTextActive,
                  ]}
                >
                  {day.short}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Description/Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Instructions</Text>
        <Text style={styles.sectionHint}>
          What should the person do? (e.g., "Take 1 pill with breakfast")
        </Text>
        <TextInput
          style={[styles.textInput, styles.descriptionInput]}
          placeholder="Enter clear instructions..."
          placeholderTextColor={COLORS.textLight}
          value={formData.description}
          onChangeText={text =>
            setFormData({ ...formData, description: text })
          }
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>How long?</Text>
        {[
          { id: 'once', label: 'One time only' },
          { id: 'daily', label: 'For a specific number of days' },
          { id: 'ongoing', label: 'Keep reminding me' },
        ].map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.radioButton,
              formData.duration === option.id && styles.radioButtonActive,
            ]}
            onPress={() =>
              setFormData({
                ...formData,
                duration: option.id as 'once' | 'daily' | 'ongoing',
              })
            }
          >
            <View
              style={[
                styles.radioCircle,
                formData.duration === option.id && styles.radioCircleActive,
              ]}
            >
              {formData.duration === option.id && (
                <View style={styles.radioCircleDot} />
              )}
            </View>
            <Text style={styles.radioLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}

        {formData.duration === 'daily' && (
          <View style={styles.durationInput}>
            <Text style={styles.durationLabel}>Number of days:</Text>
            <TextInput
              style={styles.numberInput}
              placeholder="7"
              placeholderTextColor={COLORS.textLight}
              value={formData.durationDays?.toString()}
              onChangeText={text =>
                setFormData({
                  ...formData,
                  durationDays: parseInt(text) || 7,
                })
              }
              keyboardType="number-pad"
            />
          </View>
        )}
      </View>

      {/* Family Member Notification */}
      {familyMembers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                formData.notifyFamilyMember && styles.checkboxActive,
              ]}
              onPress={() =>
                setFormData({
                  ...formData,
                  notifyFamilyMember: !formData.notifyFamilyMember,
                })
              }
            >
              {formData.notifyFamilyMember && (
                <Ionicons name="checkmark" size={20} color={COLORS.surface} />
              )}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>
              Notify a family member if missed
            </Text>
          </View>

          {formData.notifyFamilyMember && (
            <View style={styles.familyMemberSelect}>
              {familyMembers.map(member => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.familyMemberButton,
                    formData.familyMemberId === member.id &&
                      styles.familyMemberButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, familyMemberId: member.id })
                  }
                >
                  <Text
                    style={[
                      styles.familyMemberName,
                      formData.familyMemberId === member.id &&
                        styles.familyMemberNameActive,
                    ]}
                  >
                    {member.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          isSubmitting && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={COLORS.surface} size="large" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={28} color={COLORS.surface} />
            <Text style={styles.submitButtonText}>Create Reminder</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Success Modal */}
      <Modal transparent visible={showSuccess} animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successBox}>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={COLORS.success}
            />
            <Text style={styles.successTitle}>Reminder Created!</Text>
            <Text style={styles.successMessage}>
              Your reminder is now active and will notify at the scheduled time.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Bottom spacing */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  typeLabelActive: {
    color: COLORS.surface,
  },
  textInput: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  timePickerText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  timePickerDone: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  timePickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  radioButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: COLORS.primary,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: COLORS.primary,
  },
  radioCircleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  dayButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  dayButtonTextActive: {
    color: COLORS.surface,
  },
  durationInput: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  numberInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  familyMemberSelect: {
    gap: 8,
  },
  familyMemberButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  familyMemberButtonActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  familyMemberName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  familyMemberNameActive: {
    color: COLORS.surface,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginTop: 12,
    gap: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.surface,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '80%',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  successMessage: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.error,
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
});
