import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
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
        pointerEvents: 'none' as any,
      }}
    />
  );
}

function DecoLine({ width: w, top, left, rotate, opacity }: { size?: number; width: number; top: number; left: number; rotate: string; opacity: number }) {
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
        pointerEvents: 'none' as any,
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
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  const fetchSubscription = useCallback(async () => {
    try {
      const data = await billingApi.getSubscription(user?.token);
      setSubscriptionInfo(data);
    } catch {
      setSubscriptionInfo(null);
    } finally {
      setLoadingSubscription(false);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleCancelSubscription = async () => {
    setCancelModalVisible(false);
    try {
      setLoading(true);
      await billingApi.cancelSubscription(user?.token);
      showModal(
        'Subscription Cancelled',
        'Your subscription has been cancelled. You\'ll continue to have access until the end of your current billing period.',
        'checkmark-circle-outline'
      );
      fetchSubscription();
    } catch {
      showModal(
        'Error',
        'Failed to cancel subscription. Please try again or contact support.',
        'alert-circle-outline'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setLoading(true);
      await billingApi.reactivateSubscription(user?.token);
      showModal(
        'Subscription Reactivated!',
        'Your subscription is active again. You\'ll continue to enjoy all premium features.',
        'checkmark-circle-outline'
      );
      fetchSubscription();
    } catch {
      showModal(
        'Error',
        'Failed to reactivate subscription. Please try again or contact support.',
        'alert-circle-outline'
      );
    } finally {
      setLoading(false);
    }
  };

  const isSubscribed = subscriptionInfo?.tier === 'premium' && (subscriptionInfo?.status === 'active' || subscriptionInfo?.status === 'cancelling');

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
    setCheckoutModalVisible(true);
  };

  const handleCheckout = async () => {
    setCheckoutModalVisible(false);

    let checkoutWindow: Window | null = null;
    if (Platform.OS === 'web') {
      checkoutWindow = window.open('about:blank', '_blank');
    }

    try {
      setLoading(true);

      const response = await billingApi.createCheckout(
        selectedPlan,
        user?.token
      );

      if (response?.checkout_url) {
        if (Platform.OS === 'web') {
          if (checkoutWindow) {
            checkoutWindow.location.href = response.checkout_url;
          } else {
            window.location.href = response.checkout_url;
          }
        } else {
          await Linking.openURL(response.checkout_url);
        }
      } else {
        if (checkoutWindow) checkoutWindow.close();
        showModal(
          'Checkout Error',
          'Could not create checkout session. Please try again.',
          'alert-circle-outline'
        );
      }
    } catch (error) {
      if (checkoutWindow) checkoutWindow.close();
      showModal(
        'Error',
        'Failed to initiate checkout. Please try again.',
        'alert-circle-outline'
      );
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
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
      <View style={{ ...StyleSheet.absoluteFillObject, pointerEvents: 'none' as any, zIndex: 0 }}>
        <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <DecoCircle size={260} top={-80} right={-100} opacity={0.08} />
        <DecoCircle size={140} top={30} right={30} opacity={0.06} />
        <DecoCircle size={300} top={-120} left={-150} opacity={0.06} />
        <DecoCircle size={180} top={500} left={-90} opacity={0.04} />
        <DecoLine width={250} top={40} left={-60} rotate="-18deg" opacity={0.08} />
        <DecoLine width={180} top={120} left={width - 100} rotate="22deg" opacity={0.06} />
      </View>

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 50) + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{isSubscribed ? 'Manage Subscription' : 'Choose Payment Method'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        style={{ position: 'relative' as any, zIndex: 5 }}
      >
        {isSubscribed ? (
          <>
            <View style={styles.activeSubCard}>
              <View style={styles.activeSubBadge}>
                <Ionicons name="shield-checkmark" size={20} color="#34D399" />
                <Text style={styles.activeSubBadgeText}>
                  {subscriptionInfo?.status === 'cancelling' ? 'Cancelling' : 'Active'}
                </Text>
              </View>
              <Text style={styles.activeSubTitle}>Premium Subscription</Text>
              <Text style={styles.activeSubPlan}>
                {subscriptionInfo?.billing_cycle === 'annual' ? 'Annual Plan — $203.90/year' : 'Monthly Plan — $19.99/month'}
              </Text>
              {subscriptionInfo?.status === 'cancelling' && (
                <Text style={styles.activeSubNote}>
                  Access continues until end of billing period
                </Text>
              )}
            </View>

            <View style={styles.activeSubFeatures}>
              <Text style={styles.activeSubFeaturesTitle}>Your Premium Features</Text>
              {[
                { icon: 'shield-checkmark', label: 'Real-time scam detection' },
                { icon: 'people', label: 'Family alert system' },
                { icon: 'mic', label: '24/7 voice assistance' },
                { icon: 'warning', label: 'Emergency SOS' },
                { icon: 'bulb', label: 'Adaptive Learning' },
              ].map((f, i) => (
                <View key={i} style={styles.activeSubFeatureRow}>
                  <Ionicons name={f.icon as any} size={18} color="#34D399" />
                  <Text style={styles.activeSubFeatureText}>{f.label}</Text>
                </View>
              ))}
            </View>

            {subscriptionInfo?.status === 'cancelling' ? (
              <Pressable
                style={({ pressed }) => [styles.reactivateButton, pressed && { opacity: 0.7 }]}
                onPress={handleReactivate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.reactivateButtonText}>Reactivate Subscription</Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.cancelSubButton, pressed && { opacity: 0.7 }]}
                onPress={() => setCancelModalVisible(true)}
              >
                <Text style={styles.cancelSubButtonText}>Cancel Subscription</Text>
              </Pressable>
            )}
          </>
        ) : (
        <>
        <View style={styles.headlineSection}>
          <Text style={styles.headline}>Unlock Premium Features</Text>
          <Text style={styles.subheadline}>
            Get scam detection, family alerts, and 24/7 voice assistance
          </Text>
        </View>

        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>Free vs Premium</Text>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonFeatureLabel}>Feature</Text>
            <Text style={styles.comparisonColLabel}>Free</Text>
            <Text style={styles.comparisonColLabel}>Premium</Text>
          </View>
          {[
            { feature: "Voice AI Assistant", free: true, premium: true },
            { feature: "Scam Detection", free: "3/day", premium: "Unlimited" },
            { feature: "Family Members", free: "1", premium: "5" },
            { feature: "Family Scam Alerts", free: false, premium: true },
            { feature: "Emergency SOS", free: true, premium: true },
            { feature: "Adaptive Learning", free: true, premium: true },
            { feature: "Wellness Reminders", free: "3", premium: "Unlimited" },
            { feature: "Priority Support", free: false, premium: true },
          ].map((row, i) => (
            <View key={i} style={[styles.comparisonRow, i % 2 === 0 && styles.comparisonRowAlt]}>
              <Text style={styles.comparisonFeature}>{row.feature}</Text>
              <View style={styles.comparisonCell}>
                {row.free === true ? (
                  <Ionicons name="checkmark-circle" size={18} color="#34D399" />
                ) : row.free === false ? (
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.25)" />
                ) : (
                  <Text style={styles.comparisonLimit}>{row.free}</Text>
                )}
              </View>
              <View style={styles.comparisonCell}>
                {row.premium === true ? (
                  <Ionicons name="checkmark-circle" size={18} color="#34D399" />
                ) : (
                  <Text style={styles.comparisonPremiumValue}>{row.premium}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.planFrame}>
          <Text style={styles.planFrameLabel}>Select a Plan</Text>
          <View style={styles.planToggle}>
            <Pressable
              style={({ pressed }) => [styles.planOption, selectedPlan === 'monthly' && styles.planOptionActive, pressed && { opacity: 0.7 }]}
              onPress={() => setSelectedPlan('monthly')}
            >
              {selectedPlan === 'monthly' && (
                <View style={styles.planCheck}>
                  <Ionicons name="checkmark-circle" size={20} color="#34D399" />
                </View>
              )}
              <Text style={[styles.planOptionLabel, selectedPlan === 'monthly' && styles.planOptionLabelActive]}>Monthly</Text>
              <Text style={[styles.planOptionPrice, selectedPlan === 'monthly' && styles.planOptionPriceActive]}>$19.99/mo</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.planOption, selectedPlan === 'annual' && styles.planOptionActive, pressed && { opacity: 0.7 }]}
              onPress={() => setSelectedPlan('annual')}
            >
              <View style={styles.planSaveBadge}>
                <Text style={styles.planSaveText}>Save 15%</Text>
              </View>
              {selectedPlan === 'annual' && (
                <View style={styles.planCheck}>
                  <Ionicons name="checkmark-circle" size={20} color="#34D399" />
                </View>
              )}
              <Text style={[styles.planOptionLabel, selectedPlan === 'annual' && styles.planOptionLabelActive]}>Annual</Text>
              <Text style={[styles.planOptionPrice, selectedPlan === 'annual' && styles.planOptionPriceActive]}>$203.90/yr</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.optionsContainer}>
          <Pressable
            style={({ pressed }) => [styles.optionCard, selectedMethod === 'stripe' && styles.optionCardSelected, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
            onPress={() => handleSelectMethod('stripe')}
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
          </Pressable>

          <View style={styles.dropdownSection}>
            <Pressable
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
            </Pressable>
            {carrierDropdownOpen && (
              <View style={styles.dropdownList}>
                {CARRIER_OPTIONS.map((carrier) => (
                  <View key={carrier.id} style={styles.dropdownItem}>
                    <View>
                      <Text style={styles.dropdownItemName}>{carrier.name}</Text>
                      <Text style={styles.dropdownItemPrice}>{carrier.price}</Text>
                    </View>
                    <Pressable
                      style={styles.notifyButton}
                      onPress={() => handleNotifyMe('carrier', carrier.name)}
                    >
                      <Text style={styles.notifyButtonText}>Notify Me</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.dropdownSection}>
            <Pressable
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
            </Pressable>
            {insuranceDropdownOpen && (
              <View style={styles.dropdownList}>
                {INSURANCE_OPTIONS.map((ins) => (
                  <View key={ins.id} style={styles.dropdownItem}>
                    <View>
                      <Text style={styles.dropdownItemName}>{ins.name}</Text>
                      <Text style={styles.dropdownItemPrice}>{ins.price}</Text>
                    </View>
                    <Pressable
                      style={styles.notifyButton}
                      onPress={() => handleNotifyMe('insurance', ins.name)}
                    >
                      <Text style={styles.notifyButtonText}>Notify Me</Text>
                    </Pressable>
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

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
        </>
        )}
      </ScrollView>

      <ConfirmModal
        visible={cancelModalVisible}
        title="Cancel Subscription?"
        message="Your subscription will remain active until the end of your current billing period. After that, you'll be downgraded to the free plan."
        confirmLabel="Yes, Cancel"
        cancelLabel="Keep Subscription"
        onConfirm={handleCancelSubscription}
        onCancel={() => setCancelModalVisible(false)}
        icon="warning-outline"
      />

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

      <ConfirmModal
        visible={checkoutModalVisible}
        title="Confirm Your Plan"
        message={`${planDetails.label}\n${planDetails.price}\n${planDetails.renewal}\n\nYou'll be redirected to Stripe's secure checkout to complete your payment.`}
        confirmLabel={loading ? "Processing..." : "Pay Now"}
        cancelLabel="Go Back"
        icon="card-outline"
        onConfirm={handleCheckout}
        onCancel={() => setCheckoutModalVisible(false)}
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
    position: 'relative' as any,
    zIndex: 5,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 20,
    zIndex: 10,
    position: 'relative' as any,
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

  comparisonCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    marginBottom: 24,
  },
  comparisonTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  comparisonHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    marginBottom: 4,
  },
  comparisonFeatureLabel: {
    flex: 1.5,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonColLabel: {
    flex: 0.7,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  comparisonRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  comparisonFeature: {
    flex: 1.5,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
  },
  comparisonCell: {
    flex: 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonLimit: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#FBBF24',
  },
  comparisonPremiumValue: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#34D399',
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

  activeSubCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#34D399',
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  activeSubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52,211,153,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  activeSubBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#34D399',
    fontSize: 13,
  },
  activeSubTitle: {
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    fontSize: 22,
    marginBottom: 8,
  },
  activeSubPlan: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  activeSubNote: {
    fontFamily: 'Inter_400Regular',
    color: '#FBBF24',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  activeSubFeatures: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  activeSubFeaturesTitle: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  activeSubFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  activeSubFeatureText: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
  },
  cancelSubButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.5)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelSubButtonText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#EF4444',
    fontSize: 15,
  },
  reactivateButton: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  reactivateButtonText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    fontSize: 15,
  },
  planFrame: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  planFrameLabel: {
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  planCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  planToggle: {
    flexDirection: 'row',
    gap: 12,
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
