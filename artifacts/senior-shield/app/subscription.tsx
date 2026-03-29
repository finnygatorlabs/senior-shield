import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { billingApi } from '@/services/api';
import ConfirmModal from '@/components/ConfirmModal';

const { width } = Dimensions.get('window');
const GRADIENT: [string, string, string] = ['#06102E', '#0E2D6B', '#0B5FAA'];

function DecoCircle({ size, top, left, right, opacity }: { size: number; top?: number; left?: number; right?: number; opacity: number }) {
  return (
    <View
      pointerEvents="none"
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
      pointerEvents="none"
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

type PaymentMethod = 'stripe' | 'carrier' | 'insurance';

interface CarrierOption {
  id: string;
  name: string;
  price: string;
}

const CARRIER_OPTIONS: CarrierOption[] = [
  { id: 'verizon', name: 'Verizon', price: '$5.99/month' },
  { id: 'att', name: 'AT&T', price: '$5.99/month' },
  { id: 'tmobile', name: 'T-Mobile', price: '$5.99/month' },
  { id: 'sprint', name: 'Sprint', price: '$5.99/month' },
  { id: 'uscellular', name: 'US Cellular', price: '$5.99/month' },
];

const INSURANCE_OPTIONS: CarrierOption[] = [
  { id: 'medicare', name: 'Medicare Advantage', price: 'Free - $5 copay' },
  { id: 'aetna', name: 'Aetna', price: 'Free - $5 copay' },
  { id: 'united', name: 'UnitedHealthcare', price: 'Free - $5 copay' },
  { id: 'humana', name: 'Humana', price: 'Free - $5 copay' },
  { id: 'cigna', name: 'Cigna', price: 'Free - $5 copay' },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('stripe');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null);
  const [selectedInsurance, setSelectedInsurance] = useState<string | null>(null);
  const [carrierDropdownOpen, setCarrierDropdownOpen] = useState(false);
  const [insuranceDropdownOpen, setInsuranceDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', message: '', confirmLabel: 'OK', icon: 'information-circle-outline' as any });

  const showModal = (title: string, message: string, icon?: string) => {
    setModalConfig({ title, message, confirmLabel: 'OK', icon: (icon || 'information-circle-outline') as any });
    setModalVisible(true);
  };

  const planDetails = selectedPlan === 'monthly'
    ? { label: 'Premium Monthly', price: '$19.99/month', renewal: 'Auto-renews monthly' }
    : { label: 'Premium Annual', price: '$203.90/year', renewal: 'Auto-renews yearly (save 15%)' };

  const handleSelectMethod = (method: PaymentMethod) => {
    if (method === 'carrier' || method === 'insurance') {
      showModal(
        'Coming Soon',
        `${method === 'carrier' ? 'Carrier billing' : 'Insurance'} integration is coming soon. We'll notify you when it's available.\n\nFor now, please select Credit Card to get started.`,
        'time-outline'
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

        if (response?.checkout_url) {
          if (Platform.OS === 'web') {
            window.location.href = response.checkout_url;
          } else {
            await Linking.openURL(response.checkout_url);
          }
        } else {
          showModal(
            'Checkout Error',
            'Could not create checkout session. Please try again.',
            'alert-circle-outline'
          );
        }
      } catch (error) {
        showModal(
          'Error',
          'Failed to initiate checkout. Please try again.',
          'alert-circle-outline'
        );
        console.error('Checkout error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNotifyMe = (type: 'carrier' | 'insurance', name: string) => {
    showModal(
      'Notify Me',
      `We'll let you know when ${name} billing is available!`,
      'notifications-outline'
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
            <Text style={[styles.planOptionPrice, selectedPlan === 'monthly' && styles.planOptionPriceActive]}>$19.99/mo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.planOption, selectedPlan === 'annual' && styles.planOptionActive]}
            onPress={() => setSelectedPlan('annual')}
          >
            <View style={styles.planSaveBadge}>
              <Text style={styles.planSaveText}>Save 15%</Text>
            </View>
            <Text style={[styles.planOptionLabel, selectedPlan === 'annual' && styles.planOptionLabelActive]}>Annual</Text>
            <Text style={[styles.planOptionPrice, selectedPlan === 'annual' && styles.planOptionPriceActive]}>$203.90/yr</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionCard, selectedMethod === 'stripe' && styles.optionCardSelected]}
            onPress={() => setSelectedMethod('stripe')}
          >
            <View style={styles.optionCardHeader}>
              <View style={styles.optionCardLeft}>
                {selectedMethod === 'stripe' && (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Ionicons name="card" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>Credit Card</Text>
                  <Text style={styles.optionDesc}>Pay securely with Visa, Mastercard, or American Express</Text>
                </View>
              </View>
            </View>
            <Text style={styles.optionPrice}>{planDetails.price}</Text>
          </TouchableOpacity>

          <View style={styles.dropdownSection}>
            <TouchableOpacity
              style={[styles.dropdownHeader, carrierDropdownOpen && styles.dropdownHeaderOpen]}
              onPress={() => setCarrierDropdownOpen(!carrierDropdownOpen)}
            >
              <View style={styles.dropdownHeaderLeft}>
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(96,165,250,0.15)' }]}>
                  <Ionicons name="cellular" size={20} color="#60A5FA" />
                </View>
                <View>
                  <Text style={styles.optionName}>Carrier Billing</Text>
                  <Text style={styles.optionDesc}>Add to your phone bill</Text>
                </View>
              </View>
              <View style={styles.dropdownRight}>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
                <Ionicons name={carrierDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.5)" />
              </View>
            </TouchableOpacity>
            {carrierDropdownOpen && (
              <View style={styles.dropdownList}>
                {CARRIER_OPTIONS.map((carrier) => (
                  <View key={carrier.id} style={styles.dropdownItem}>
                    <View>
                      <Text style={styles.dropdownItemName}>{carrier.name}</Text>
                      <Text style={styles.dropdownItemPrice}>{carrier.price}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.notifyButton}
                      onPress={() => handleNotifyMe('carrier', carrier.name)}
                    >
                      <Text style={styles.notifyButtonText}>Notify Me</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.dropdownSection}>
            <TouchableOpacity
              style={[styles.dropdownHeader, insuranceDropdownOpen && styles.dropdownHeaderOpen]}
              onPress={() => setInsuranceDropdownOpen(!insuranceDropdownOpen)}
            >
              <View style={styles.dropdownHeaderLeft}>
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(52,211,153,0.15)' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#34D399" />
                </View>
                <View>
                  <Text style={styles.optionName}>Insurance</Text>
                  <Text style={styles.optionDesc}>Covered by your health plan</Text>
                </View>
              </View>
              <View style={styles.dropdownRight}>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
                <Ionicons name={insuranceDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.5)" />
              </View>
            </TouchableOpacity>
            {insuranceDropdownOpen && (
              <View style={styles.dropdownList}>
                {INSURANCE_OPTIONS.map((ins) => (
                  <View key={ins.id} style={styles.dropdownItem}>
                    <View>
                      <Text style={styles.dropdownItemName}>{ins.name}</Text>
                      <Text style={styles.dropdownItemPrice}>{ins.price}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.notifyButton}
                      onPress={() => handleNotifyMe('insurance', ins.name)}
                    >
                      <Text style={styles.notifyButtonText}>Notify Me</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
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

      <ConfirmModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel="Close"
        icon={modalConfig.icon}
        onConfirm={() => setModalVisible(false)}
        onCancel={() => setModalVisible(false)}
      />
    </View>
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
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
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
  },
  optionCardSelected: {
    borderColor: 'rgba(52,211,153,0.5)',
    backgroundColor: 'rgba(52,211,153,0.1)',
  },
  optionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  optionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    flexShrink: 1,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  optionPrice: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#34D399',
    marginLeft: 72,
  },

  dropdownSection: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dropdownHeaderOpen: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  dropdownHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#FBBF24',
  },
  dropdownList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dropdownItemName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  dropdownItemPrice: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  notifyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    backgroundColor: 'rgba(251,191,36,0.1)',
  },
  notifyButtonText: {
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
