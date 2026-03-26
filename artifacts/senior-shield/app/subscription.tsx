import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { billingApi } from '@/services/api';

const { width } = Dimensions.get('window');
const GRADIENT: [string, string, string] = ['#06102E', '#0E2D6B', '#0B5FAA'];

function DecoCircle({ size, top, left, right, opacity }: { size: number; top?: number; left?: number; right?: number; opacity: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: `rgba(255,255,255,${opacity})`,
        top,
        left,
        right,
      }}
    />
  );
}

function DecoLine({ width: w, top, left, rotate, opacity }: { width: number; top: number; left: number; rotate: string; opacity: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        width: w,
        height: 1,
        backgroundColor: `rgba(255,255,255,${opacity})`,
        top,
        left,
        transform: [{ rotate }],
      }}
    />
  );
}

type PaymentMethod = 'stripe' | 'verizon' | 'att' | 'tmobile' | 'medicare';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
  price: string;
  status: 'active' | 'coming-soon';
  color: string;
  backgroundColor: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'stripe',
    name: 'Credit Card',
    icon: 'card',
    description: 'Pay securely with Visa, Mastercard, or American Express',
    price: '$12.99/month',
    status: 'active',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  {
    id: 'verizon',
    name: 'Verizon',
    icon: 'phone-portrait',
    description: 'Add to your Verizon bill',
    price: '$5.99/month',
    status: 'coming-soon',
    color: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  {
    id: 'att',
    name: 'AT&T',
    icon: 'phone-portrait',
    description: 'Add to your AT&T bill',
    price: '$5.99/month',
    status: 'coming-soon',
    color: '#60A5FA',
    backgroundColor: 'rgba(96,165,250,0.15)',
  },
  {
    id: 'tmobile',
    name: 'T-Mobile',
    icon: 'phone-portrait',
    description: 'Add to your T-Mobile bill',
    price: '$5.99/month',
    status: 'coming-soon',
    color: '#F472B6',
    backgroundColor: 'rgba(244,114,182,0.15)',
  },
  {
    id: 'medicare',
    name: 'Medicare Advantage',
    icon: 'shield-checkmark',
    description: 'Covered by your Medicare plan',
    price: 'Free - $5 copay',
    status: 'coming-soon',
    color: '#34D399',
    backgroundColor: 'rgba(52,211,153,0.15)',
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('stripe');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);

  const planDetails = selectedPlan === 'monthly'
    ? { label: 'Premium Monthly', price: '$12.99/month', renewal: 'Auto-renews monthly' }
    : { label: 'Premium Annual', price: '$99.99/year', renewal: 'Auto-renews yearly (save 36%)' };

  const handleSelectMethod = (method: PaymentMethod) => {
    const option = PAYMENT_OPTIONS.find((o) => o.id === method);
    if (option?.status === 'coming-soon') {
      Alert.alert(
        'Coming Soon',
        `${option.name} integration is coming soon. We'll notify you when it's available.\n\nFor now, please select Credit Card to get started.`,
        [{ text: 'OK' }]
      );
      return;
    }
    setSelectedMethod(method);
  };

  const handleContinue = async () => {
    if (selectedMethod === 'stripe') {
      try {
        setLoading(true);

        const response = await billingApi.createCheckout(
          selectedPlan,
          user?.token
        );

        if (response?.url) {
          Alert.alert(
            'Stripe Checkout',
            'Stripe checkout URL ready. Implementation pending environment variable setup.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        Alert.alert(
          'Error',
          'Failed to initiate checkout. Please try again.',
          [{ text: 'OK' }]
        );
        console.error('Checkout error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleContactSales = (method: PaymentMethod) => {
    const option = PAYMENT_OPTIONS.find((o) => o.id === method);
    Alert.alert(
      'Contact Sales',
      `Interested in ${option?.name} integration?\n\nEmail us at sales@seniorshield.app`,
      [
        {
          text: 'Copy Email',
          onPress: () => {
            Alert.alert('Email copied to clipboard');
          },
        },
        { text: 'Cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <DecoCircle size={260} top={-80} right={-100} opacity={0.08} />
      <DecoCircle size={140} top={30} right={30} opacity={0.06} />
      <DecoCircle size={300} top={-120} left={-150} opacity={0.06} />
      <DecoCircle size={180} top={500} left={-90} opacity={0.04} />
      <DecoLine width={250} top={40} left={-60} rotate="-18deg" opacity={0.08} />
      <DecoLine width={180} top={120} left={width - 100} rotate="22deg" opacity={0.06} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 50) + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Payment Method</Text>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step 2 of 3</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: '66%' }]} />
        </View>

        <View style={styles.headlineSection}>
          <Text style={styles.headline}>Unlock Premium Features</Text>
          <Text style={styles.subheadline}>
            Get scam detection, family alerts, and 24/7 voice assistance
          </Text>
        </View>

        <View style={styles.planToggle}>
          <TouchableOpacity
            style={[styles.planOption, selectedPlan === 'monthly' && styles.planOptionActive]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={[styles.planOptionLabel, selectedPlan === 'monthly' && styles.planOptionLabelActive]}>Monthly</Text>
            <Text style={[styles.planOptionPrice, selectedPlan === 'monthly' && styles.planOptionPriceActive]}>$12.99/mo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.planOption, selectedPlan === 'annual' && styles.planOptionActive]}
            onPress={() => setSelectedPlan('annual')}
          >
            <View style={styles.planSaveBadge}>
              <Text style={styles.planSaveText}>Save 36%</Text>
            </View>
            <Text style={[styles.planOptionLabel, selectedPlan === 'annual' && styles.planOptionLabelActive]}>Annual</Text>
            <Text style={[styles.planOptionPrice, selectedPlan === 'annual' && styles.planOptionPriceActive]}>$99.99/yr</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.optionsContainer}>
          {PAYMENT_OPTIONS.map((option) => (
            <PaymentOptionCard
              key={option.id}
              option={option}
              isSelected={selectedMethod === option.id}
              onSelect={() => handleSelectMethod(option.id)}
              onContactSales={() => handleContactSales(option.id)}
            />
          ))}
        </View>

        {selectedMethod === 'stripe' && (
          <View style={styles.detailsSection}>
            <View style={styles.detailsCard}>
              <View style={styles.detailsHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#34D399" />
                <Text style={styles.detailsTitle}>Secure Payment</Text>
              </View>
              <Text style={styles.detailsText}>
                Your payment information is encrypted and secured by Stripe, the world's most trusted payment processor.
              </Text>
              <View style={styles.detailsList}>
                <DetailItem icon="lock-closed" text="256-bit SSL encryption" />
                <DetailItem icon="shield-checkmark" text="PCI DSS compliant" />
                <DetailItem icon="checkmark" text="Money-back guarantee" />
              </View>
            </View>
          </View>
        )}

        <View style={styles.billingSection}>
          <Text style={styles.billingLabel}>Billing Details</Text>
          <View style={styles.billingCard}>
            <View style={styles.billingRow}>
              <Text style={styles.billingKey}>Plan</Text>
              <Text style={styles.billingValue}>{planDetails.label}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.billingRow}>
              <Text style={styles.billingKey}>Price</Text>
              <Text style={styles.billingValue}>{planDetails.price}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.billingRow}>
              <Text style={styles.billingKey}>Renewal</Text>
              <Text style={styles.billingValue}>{planDetails.renewal}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.billingRow}>
              <Text style={styles.billingKey}>Cancel Anytime</Text>
              <Ionicons name="checkmark" size={20} color="#34D399" />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, loading && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0E2D6B" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue to Payment</Text>
              <Ionicons name="arrow-forward" size={20} color="#0E2D6B" />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </ScrollView>
    </View>
  );
}

interface PaymentOptionCardProps {
  option: PaymentOption;
  isSelected: boolean;
  onSelect: () => void;
  onContactSales: () => void;
}

function PaymentOptionCard({
  option,
  isSelected,
  onSelect,
  onContactSales,
}: PaymentOptionCardProps) {
  const isComingSoon = option.status === 'coming-soon';

  return (
    <TouchableOpacity
      style={[
        styles.optionCard,
        isSelected && !isComingSoon && styles.optionCardSelected,
        isComingSoon && styles.optionCardDisabled,
      ]}
      onPress={onSelect}
      disabled={isComingSoon}
    >
      {!isComingSoon && (
        <View style={[styles.selectionIndicator, isSelected && styles.selectionIndicatorActive]}>
          {isSelected && (
            <View style={styles.selectionDot}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>
      )}

      {isComingSoon && (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>
      )}

      <View style={styles.optionContent}>
        <View style={styles.optionHeader}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: option.backgroundColor,
                opacity: isComingSoon ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons
              name={option.icon as any}
              size={24}
              color={option.color}
            />
          </View>
          <View style={styles.optionInfo}>
            <Text
              style={[
                styles.optionName,
                isComingSoon && styles.optionNameDisabled,
              ]}
            >
              {option.name}
            </Text>
            <Text
              style={[
                styles.optionDescription,
                isComingSoon && styles.optionDescriptionDisabled,
              ]}
            >
              {option.description}
            </Text>
          </View>
        </View>

        <View style={styles.optionFooter}>
          <Text
            style={[
              styles.optionPrice,
              isComingSoon && styles.optionPriceDisabled,
            ]}
          >
            {option.price}
          </Text>
          {isComingSoon && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={onContactSales}
            >
              <Text style={styles.contactButtonText}>Notify Me</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface DetailItemProps {
  icon: string;
  text: string;
}

function DetailItem({ icon, text }: DetailItemProps) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon as any} size={18} color="#34D399" />
      <Text style={styles.detailItemText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  stepIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  stepText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
  },

  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 2,
  },

  headlineSection: {
    marginBottom: 28,
  },
  headline: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },

  planToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  planOption: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    position: 'relative',
  },
  planOptionActive: {
    borderColor: 'rgba(52,211,153,0.5)',
    backgroundColor: 'rgba(52,211,153,0.1)',
  },
  planOptionLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  planOptionLabelActive: {
    color: '#FFFFFF',
  },
  planOptionPrice: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.4)',
  },
  planOptionPriceActive: {
    color: '#34D399',
  },
  planSaveBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#34D399',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planSaveText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#0E2D6B',
  },

  optionsContainer: {
    marginBottom: 28,
    gap: 12,
  },

  optionCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  optionCardSelected: {
    borderColor: 'rgba(52,211,153,0.5)',
    backgroundColor: 'rgba(52,211,153,0.1)',
  },
  optionCardDisabled: {
    opacity: 0.5,
  },

  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIndicatorActive: {
    borderColor: '#34D399',
  },
  selectionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
  },

  comingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#FBBF24',
  },

  optionContent: {
    flex: 1,
  },

  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionNameDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
  optionDescription: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  optionDescriptionDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },

  optionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionPrice: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#34D399',
  },
  optionPriceDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },

  contactButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    backgroundColor: 'rgba(251,191,36,0.1)',
  },
  contactButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FBBF24',
  },

  detailsSection: {
    marginBottom: 24,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  detailsText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsList: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItemText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 8,
  },

  billingSection: {
    marginBottom: 24,
  },
  billingLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  billingCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  billingKey: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.6)',
  },
  billingValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  continueButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#0E2D6B',
  },

  termsText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
