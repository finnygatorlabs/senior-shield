import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  Image,
  ActionSheetIOS,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import PageHeader from "@/components/PageHeader";
import PremiumGate from "@/components/PremiumGate";
import { scamApi, familyApi, userApi, ApiError } from "@/services/api";

interface AttachedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getFileIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type.startsWith("image/")) return "image-outline";
  if (type === "application/pdf") return "document-text-outline";
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || type === "application/msword") return "document-text-outline";
  return "document-outline";
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface LayerResult {
  name: string;
  score: number;
  maxScore: number;
  findings: string[];
}

interface AnalysisResult {
  id: string;
  risk_score: number;
  risk_level: "safe" | "low_risk" | "medium_risk" | "high_risk" | "critical_risk";
  confidence: number;
  detected_patterns: string[];
  explanation: string;
  recommendation: string;
  layers: LayerResult[];
  entities: {
    urls: string[];
    phones: string[];
    emails: string[];
    amounts: string[];
    senderEmail: string | null;
  };
  keywords_detected: string[];
}

const RISK_CONFIG: Record<string, { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  safe: { color: "#10B981", bg: "#D1FAE5", label: "Safe", icon: "checkmark-circle" },
  low_risk: { color: "#3B82F6", bg: "#DBEAFE", label: "Low Risk", icon: "information-circle" },
  medium_risk: { color: "#F59E0B", bg: "#FEF3C7", label: "Medium Risk", icon: "warning" },
  high_risk: { color: "#EF4444", bg: "#FEE2E2", label: "High Risk", icon: "alert-circle" },
  critical_risk: { color: "#991B1B", bg: "#FEE2E2", label: "Critical Risk", icon: "skull" },
};

const PATTERN_LABELS: Record<string, string> = {
  phishing: "Phishing attempt",
  urgency_scam: "Urgency pressure tactic",
  personal_info_request: "Requests sensitive info",
  tech_support_scam: "Tech support scam",
  romance_scam: "Romance scam",
  lottery_scam: "Lottery/prize scam",
  grandparent_scam: "Grandparent scam",
  secrecy_pressure: "Secrecy pressure",
  legal_threat_scam: "Legal threat scam",
  urgency: "Creates urgency",
  financial_language: "Financial language",
  authority_impersonation: "Impersonates authority",
  threat_language: "Threat language",
  sensitive_info_request: "Wants personal info",
  suspicious_links: "Suspicious links",
  sender_spoofing: "Sender spoofing",
};

const QUICK_TESTS = [
  "URGENT: Your bank account has been suspended. Click here to verify immediately: bit.ly/12abc",
  "Hi, it's your grandson! I'm in jail and need $500 in gift cards for bail. Don't tell Mom.",
  "Congratulations! You've won $5,000. Send your SSN and bank account to claim your prize.",
  "From: support@amaz0n-secure.net\nSubject: Your Amazon account has been compromised!\nYour account has been suspended due to suspicious activity. Click here immediately to verify your account.",
];

export default function ScamScreen() {
  const { theme } = useTheme();
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<Record<number, boolean>>({});
  const [alertSending, setAlertSending] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [attachment, setAttachment] = useState<AttachedFile | null>(null);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [scamUsage, setScamUsage] = useState<{ count: number; limit: number; remaining: number; locked: boolean } | null>(null);
  const [isPremium, setIsPremium] = useState(true);

  const fetchUsage = useCallback(async () => {
    try {
      const data = await userApi.getFeatureUsage(user?.token);
      setIsPremium(!!data.isPremium);
      if (data.usage?.scam_analyze) {
        setScamUsage(data.usage.scam_analyze);
      }
    } catch {}
  }, [user?.token]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  function showAttachOptions() {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword";
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
          window.alert("File Too Large — please select a file smaller than 10 MB.");
          return;
        }
        const uri = URL.createObjectURL(file);
        setAttachment({
          uri,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
        });
      };
      input.click();
      return;
    }

    const options = ["Take Photo", "Choose from Gallery", "Pick a File", "Cancel"];
    const cancelIndex = 3;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, title: "Attach Suspicious Content" },
        (idx) => {
          if (idx === 0) pickFromCamera();
          else if (idx === 1) pickFromGallery();
          else if (idx === 2) pickDocument();
        }
      );
    } else {
      Alert.alert("Attach Suspicious Content", "How would you like to attach the file?", [
        { text: "Take Photo", onPress: pickFromCamera },
        { text: "Choose from Gallery", onPress: pickFromGallery },
        { text: "Pick a File", onPress: pickDocument },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Please allow camera access to take photos of suspicious messages.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachment({
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      });
    }
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Please allow photo library access to select images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachment({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      });
    }
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.size && asset.size > MAX_FILE_SIZE) {
          Alert.alert("File Too Large", "Please select a file smaller than 10 MB.");
          return;
        }
        setAttachment({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size,
        });
      }
    } catch {
      Alert.alert("Error", "Could not pick file. Please try again.");
    }
  }

  async function analyze(textToAnalyze?: string) {
    const target = textToAnalyze || text;
    const hasText = target.trim().length > 0;
    const hasFile = !!attachment;

    if (!hasText && !hasFile) {
      Alert.alert("Nothing to analyze", "Please paste a message or attach a file to check.");
      return;
    }

    if (!isPremium && scamUsage && scamUsage.remaining <= 0) {
      setShowPremiumGate(true);
      return;
    }

    setLoading(true);
    setResult(null);
    setFeedbackSent(false);
    setExpandedLayers({});
    setAlertSent(false);
    setAlertMessage("");

    try {
      let data;

      if (hasFile) {
        const formData = new FormData();
        if (hasText) formData.append("text", target);
        if (Platform.OS === "web") {
          const resp = await fetch(attachment!.uri);
          const blob = await resp.blob();
          formData.append("file", new File([blob], attachment!.name, { type: attachment!.type }));
        } else {
          formData.append("file", {
            uri: attachment!.uri,
            name: attachment!.name,
            type: attachment!.type,
          } as any);
        }
        data = await scamApi.analyzeWithAttachment(formData, user?.token);
      } else {
        data = await scamApi.analyze(target, user?.token);
      }

      if (!data.risk_level || data.risk_score === undefined) {
        Alert.alert("Error", "Received an unexpected response. Please try again.");
        return;
      }
      setResult({
        ...data,
        confidence: data.confidence ?? 0,
        detected_patterns: data.detected_patterns ?? [],
        layers: data.layers ?? [],
        entities: data.entities ?? { urls: [], phones: [], emails: [], amounts: [], senderEmail: null },
        keywords_detected: data.keywords_detected ?? [],
        recommendation: data.recommendation ?? "",
        explanation: data.explanation ?? "",
      });
      Haptics.notificationAsync(
        data.risk_level === "critical_risk" || data.risk_level === "high_risk"
          ? Haptics.NotificationFeedbackType.Error
          : data.risk_level === "medium_risk" || data.risk_level === "low_risk"
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );

      if (!isPremium) {
        try {
          const usageResult = await userApi.incrementFeatureUsage("scam_analyze", user?.token);
          setScamUsage({
            count: usageResult.count,
            limit: usageResult.limit,
            remaining: usageResult.remaining,
            locked: !usageResult.allowed,
          });
        } catch {}
      }
    } catch (err) {
      Alert.alert("Error", "Could not analyze. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(type: "correct" | "false_positive" | "false_negative") {
    if (!result) return;
    try {
      await scamApi.sendFeedback(result.id, type, user?.token);
      setFeedbackSent(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {}
  }

  async function alertFamily() {
    if (!result || alertSending || alertSent) return;
    setAlertSending(true);
    try {
      const data = await scamApi.alertFamily(result.id, user?.token);
      setAlertSent(true);
      setAlertMessage(data.message || "Alert sent to your family.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const msg = err?.data?.message || "Could not send alert. Make sure you have family members added in the Family tab.";
      Alert.alert("Alert Failed", msg);
    } finally {
      setAlertSending(false);
    }
  }

  function toggleLayer(idx: number) {
    setExpandedLayers(prev => ({ ...prev, [idx]: !prev[idx] }));
  }

  const riskConfig = result ? (RISK_CONFIG[result.risk_level] || RISK_CONFIG.safe) : RISK_CONFIG.safe;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader screenTitle="Scam Analyzer" />

      <PremiumGate
        visible={showPremiumGate}
        onClose={() => setShowPremiumGate(false)}
        feature="scam_analyze"
        usageCount={scamUsage?.count}
        usageLimit={scamUsage?.limit}
        description="You've used all your free scam scans. Upgrade to Premium for unlimited scam analysis and real-time protection."
      />

    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: tabBarHeight + insets.bottom + 24, paddingTop: 16 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >

      {!isPremium && scamUsage && !result && (
        <View style={[styles.usageBanner, { backgroundColor: scamUsage.remaining > 0 ? '#EFF6FF' : '#FEF2F2' }]}>
          <Ionicons
            name={scamUsage.remaining > 0 ? "information-circle" : "lock-closed"}
            size={18}
            color={scamUsage.remaining > 0 ? "#2563EB" : "#DC2626"}
          />
          <Text style={[styles.usageBannerText, { color: scamUsage.remaining > 0 ? '#1E40AF' : '#991B1B' }]}>
            {scamUsage.remaining > 0
              ? `${scamUsage.remaining} free scan${scamUsage.remaining === 1 ? '' : 's'} remaining`
              : 'No free scans left — upgrade to Premium'}
          </Text>
        </View>
      )}

      <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.inputHeader}>
          <Ionicons name="clipboard-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.inputLabel, { color: theme.textSecondary, fontSize: ts.sm }]}>Enter message here</Text>
          <Pressable onPress={() => setShowHelpModal(true)} hitSlop={12} style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>
        <TextInput
          style={[styles.textArea, { color: theme.text, backgroundColor: theme.inputBackground, fontSize: ts.base }]}
          value={text}
          onChangeText={setText}
          placeholder="Enter or paste the suspicious message, email, or text..."
          placeholderTextColor={theme.placeholder}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        {attachment ? (
          <View style={[styles.attachmentPreview, { backgroundColor: theme.inputBackground, borderColor: theme.cardBorder }]}>
            {attachment.type.startsWith("image/") ? (
              <Image source={{ uri: attachment.uri }} style={styles.attachmentThumb} />
            ) : (
              <View style={[styles.attachmentFileIcon, { backgroundColor: theme.card }]}>
                <Ionicons name={getFileIcon(attachment.type)} size={24} color={theme.accent || "#3B82F6"} />
              </View>
            )}
            <View style={styles.attachmentInfo}>
              <Text style={[styles.attachmentName, { color: theme.text, fontSize: ts.sm }]} numberOfLines={1}>{attachment.name}</Text>
              {attachment.size ? (
                <Text style={[styles.attachmentSize, { color: theme.textSecondary, fontSize: ts.xs }]}>{formatFileSize(attachment.size)}</Text>
              ) : null}
            </View>
            <Pressable onPress={() => setAttachment(null)} hitSlop={12} style={styles.attachmentRemove}>
              <Ionicons name="close-circle" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.attachRow}>
            <Pressable
              onPress={showAttachOptions}
              style={[styles.attachButton, { borderColor: theme.cardBorder }]}
            >
              <Ionicons name="attach" size={18} color={theme.textSecondary} />
              <Text style={[styles.attachButtonText, { color: theme.textSecondary, fontSize: ts.sm }]}>Attach File or Photo</Text>
            </Pressable>
            <Text style={[styles.attachHint, { color: theme.textTertiary, fontSize: ts.xs }]}>
              JPG, PNG, PDF, TXT, DOC, DOCX (max 10 MB)
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.analyzeButton, loading && styles.disabled, pressed && styles.pressed]}
          onPress={() => analyze()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
              <Text style={[styles.analyzeButtonText, { fontSize: ts.base }]}>
                {attachment ? "Analyze Attachment" : "Analyze Message"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {!result && !loading && (
        <View style={styles.quickTests}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontSize: ts.base }]}>Try a sample</Text>
          {QUICK_TESTS.map((test, i) => (
            <Pressable
              key={i}
              onPress={() => { setText(test); analyze(test); }}
              style={[styles.quickTestCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <Ionicons name="flask-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.quickTestText, { color: theme.textSecondary, fontSize: ts.xs }]} numberOfLines={2}>
                {test}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
            </Pressable>
          ))}
        </View>
      )}

      {result && (
        <View style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.riskBanner, { backgroundColor: riskConfig.bg }]}>
            <Ionicons
              name={riskConfig.icon as any}
              size={32}
              color={riskConfig.color}
            />
            <View style={styles.riskInfo}>
              <Text style={[styles.riskLabel, { color: riskConfig.color, fontSize: ts.lg }]}>
                {riskConfig.label}
              </Text>
              <Text style={[styles.riskScore, { color: riskConfig.color, fontSize: ts.xs }]}>
                Risk Score: {result.risk_score}/100 ({Math.round(result.confidence * 100)}% confidence)
              </Text>
            </View>
            <View style={[styles.scoreCircle, { borderColor: riskConfig.color }]}>
              <Text style={[styles.scoreNumber, { color: riskConfig.color }]}>
                {result.risk_score}
              </Text>
            </View>
          </View>

          <View style={styles.resultBody}>
            <Text style={[styles.resultSectionTitle, { color: theme.text, fontSize: ts.base }]}>Recommendation</Text>
            <Text style={[styles.recommendation, { color: riskConfig.color, fontSize: ts.sm }]}>{result.recommendation}</Text>

            <Text style={[styles.resultSectionTitle, { color: theme.text, marginTop: 16, fontSize: ts.base }]}>Analysis</Text>
            <Text style={[styles.explanation, { color: theme.textSecondary, fontSize: ts.sm }]}>{result.explanation}</Text>

            {result.detected_patterns.length > 0 && (
              <>
                <Text style={[styles.resultSectionTitle, { color: theme.text, marginTop: 16, fontSize: ts.base }]}>
                  Warning Signs ({result.detected_patterns.length})
                </Text>
                {result.detected_patterns.map((pattern, i) => (
                  <View key={i} style={styles.patternRow}>
                    <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                    <Text style={[styles.patternText, { color: theme.text, fontSize: ts.sm }]}>
                      {PATTERN_LABELS[pattern] || pattern.replace(/_/g, " ")}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {result.layers && result.layers.length > 0 && (
              <>
                <Text style={[styles.resultSectionTitle, { color: theme.text, marginTop: 20, fontSize: ts.base }]}>
                  Detection Layers
                </Text>
                {result.layers.map((layer, idx) => (
                  <Pressable key={idx} onPress={() => toggleLayer(idx)}>
                    <View style={[styles.layerCard, { backgroundColor: theme.inputBackground, borderColor: theme.cardBorder }]}>
                      <View style={styles.layerHeader}>
                        <View style={[styles.layerScoreBadge, { backgroundColor: layer.score > 0 ? (layer.score >= layer.maxScore * 0.7 ? "#FEE2E2" : "#FEF3C7") : "#D1FAE5" }]}>
                          <Text style={[styles.layerScoreText, { color: layer.score > 0 ? (layer.score >= layer.maxScore * 0.7 ? "#991B1B" : "#92400E") : "#065F46", fontSize: ts.xs }]}>
                            {layer.score}/{layer.maxScore}
                          </Text>
                        </View>
                        <Text style={[styles.layerName, { color: theme.text, fontSize: ts.sm }]}>{layer.name}</Text>
                        <Ionicons
                          name={expandedLayers[idx] ? "chevron-up" : "chevron-down"}
                          size={16}
                          color={theme.textSecondary}
                        />
                      </View>
                      {expandedLayers[idx] && layer.findings.length > 0 && (
                        <View style={styles.layerFindings}>
                          {layer.findings.map((finding, fi) => (
                            <View key={fi} style={styles.findingRow}>
                              <View style={[styles.findingDot, { backgroundColor: "#F59E0B" }]} />
                              <Text style={[styles.findingText, { color: theme.textSecondary, fontSize: ts.xs }]}>{finding}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {expandedLayers[idx] && layer.findings.length === 0 && (
                        <Text style={[styles.noFindings, { color: theme.textTertiary, fontSize: ts.xs }]}>No issues found in this layer</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </>
            )}

            {(result.entities?.urls?.length > 0 || result.entities?.phones?.length > 0 || result.entities?.emails?.length > 0 || result.entities?.amounts?.length > 0) && (
              <>
                <Text style={[styles.resultSectionTitle, { color: theme.text, marginTop: 20, fontSize: ts.base }]}>
                  Extracted Info
                </Text>
                <View style={[styles.entitiesCard, { backgroundColor: theme.inputBackground, borderColor: theme.cardBorder }]}>
                  {result.entities.senderEmail && (
                    <View style={styles.entityRow}>
                      <Ionicons name="person" size={14} color={theme.textSecondary} />
                      <Text style={[styles.entityLabel, { color: theme.textSecondary, fontSize: ts.xs }]}>Sender:</Text>
                      <Text style={[styles.entityValue, { color: theme.text, fontSize: ts.xs }]}>{result.entities.senderEmail}</Text>
                    </View>
                  )}
                  {result.entities.urls.map((url, i) => (
                    <View key={`u${i}`} style={styles.entityRow}>
                      <Ionicons name="link" size={14} color={theme.textSecondary} />
                      <Text style={[styles.entityLabel, { color: theme.textSecondary, fontSize: ts.xs }]}>Link:</Text>
                      <Text style={[styles.entityValue, { color: theme.text, fontSize: ts.xs }]} numberOfLines={1}>{url}</Text>
                    </View>
                  ))}
                  {result.entities.phones.map((phone, i) => (
                    <View key={`p${i}`} style={styles.entityRow}>
                      <Ionicons name="call" size={14} color={theme.textSecondary} />
                      <Text style={[styles.entityLabel, { color: theme.textSecondary, fontSize: ts.xs }]}>Phone:</Text>
                      <Text style={[styles.entityValue, { color: theme.text, fontSize: ts.xs }]}>{phone}</Text>
                    </View>
                  ))}
                  {result.entities.amounts.map((amt, i) => (
                    <View key={`a${i}`} style={styles.entityRow}>
                      <Ionicons name="cash" size={14} color={theme.textSecondary} />
                      <Text style={[styles.entityLabel, { color: theme.textSecondary, fontSize: ts.xs }]}>Amount:</Text>
                      <Text style={[styles.entityValue, { color: theme.text, fontSize: ts.xs }]}>{amt}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {result.risk_level !== "safe" && result.risk_level !== "low_risk" && (
              <View style={styles.alertFamilySection}>
                {alertSent ? (
                  <View style={styles.alertSentBanner}>
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    <Text style={[styles.alertSentText, { fontSize: ts.sm }]}>{alertMessage}</Text>
                  </View>
                ) : (
                  <Pressable
                    style={({ pressed }) => [styles.alertFamilyBtn, pressed && styles.pressed, alertSending && styles.disabled]}
                    onPress={alertFamily}
                    disabled={alertSending}
                  >
                    {alertSending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="people" size={20} color="#FFFFFF" />
                        <Text style={[styles.alertFamilyBtnText, { fontSize: ts.sm }]}>Alert Family Members</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            )}

            {!feedbackSent ? (
              <View style={styles.feedbackSection}>
                <Text style={[styles.feedbackTitle, { color: theme.textSecondary, fontSize: ts.sm }]}>Was this accurate?</Text>
                <View style={styles.feedbackButtons}>
                  <Pressable
                    style={[styles.feedbackBtn, { backgroundColor: "#D1FAE5", borderColor: "#10B981" }]}
                    onPress={() => sendFeedback("correct")}
                  >
                    <Ionicons name="checkmark" size={16} color="#10B981" />
                    <Text style={[styles.feedbackBtnText, { color: "#10B981", fontSize: ts.sm }]}>Yes</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.feedbackBtn, { backgroundColor: "#FEE2E2", borderColor: "#EF4444" }]}
                    onPress={() => sendFeedback(result.risk_level === "safe" ? "false_negative" : "false_positive")}
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                    <Text style={[styles.feedbackBtnText, { color: "#EF4444", fontSize: ts.sm }]}>No, wrong</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.feedbackThankYou}>
                <Ionicons name="heart" size={16} color="#2563EB" />
                <Text style={[styles.feedbackThanks, { color: "#2563EB", fontSize: ts.sm }]}>Thanks for the feedback!</Text>
              </View>
            )}

            <Pressable
              onPress={() => { setResult(null); setText(""); setExpandedLayers({}); setAlertSent(false); setAlertMessage(""); }}
              style={[styles.analyzeAnotherBtn, { borderColor: theme.border }]}
            >
              <Text style={[styles.analyzeAnotherText, { color: theme.textSecondary, fontSize: ts.sm }]}>Check another message</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>

      <Modal visible={showHelpModal} transparent animationType="fade" onRequestClose={() => setShowHelpModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowHelpModal(false)}>
          <View style={[styles.helpModal, { backgroundColor: theme.card }]}>
            <View style={styles.helpHeader}>
              <Ionicons name="information-circle" size={28} color="#2563EB" />
              <Text style={[styles.helpTitle, { color: theme.text, fontSize: ts.md }]}>How to Check a Message</Text>
            </View>

            <View style={styles.helpStep}>
              <Text style={[styles.helpStepNum, { backgroundColor: "#2563EB" }]}>1</Text>
              <View style={styles.helpStepContent}>
                <Text style={[styles.helpStepTitle, { color: theme.text, fontSize: ts.sm }]}>From Email</Text>
                <Text style={[styles.helpStepDesc, { color: theme.textSecondary, fontSize: ts.xs }]}>
                  Open the suspicious email. Tap and hold on the message text until it highlights. Drag the handles to select all the text. Tap "Copy." Come back here and tap the text box, then tap "Paste."
                </Text>
              </View>
            </View>

            <View style={styles.helpStep}>
              <Text style={[styles.helpStepNum, { backgroundColor: "#2563EB" }]}>2</Text>
              <View style={styles.helpStepContent}>
                <Text style={[styles.helpStepTitle, { color: theme.text, fontSize: ts.sm }]}>From a Text Message</Text>
                <Text style={[styles.helpStepDesc, { color: theme.textSecondary, fontSize: ts.xs }]}>
                  Open the suspicious text. Tap and hold the message bubble. Tap "Copy." Come back to SeniorShield and paste it in the box above.
                </Text>
              </View>
            </View>

            <View style={styles.helpStep}>
              <Text style={[styles.helpStepNum, { backgroundColor: "#2563EB" }]}>3</Text>
              <View style={styles.helpStepContent}>
                <Text style={[styles.helpStepTitle, { color: theme.text, fontSize: ts.sm }]}>Or Just Type It</Text>
                <Text style={[styles.helpStepDesc, { color: theme.textSecondary, fontSize: ts.xs }]}>
                  If you can't copy the message, type the key details: who sent it, what they asked for, and any links or phone numbers they included.
                </Text>
              </View>
            </View>

            <Pressable onPress={() => setShowHelpModal(false)} style={styles.helpCloseBtn}>
              <Text style={[styles.helpCloseBtnText, { fontSize: ts.base }]}>Got it!</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  usageBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  usageBannerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flex: 1,
  },
  inputCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24, gap: 14 },
  inputHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  inputLabel: { fontFamily: "Inter_500Medium", flex: 1 },
  infoButton: { padding: 2 },
  textArea: {
    borderRadius: 14,
    padding: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 120,
    lineHeight: 24,
  },
  attachRow: {
    marginBottom: 4,
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    alignSelf: "flex-start",
  },
  attachButtonText: {
    fontFamily: "Inter_500Medium",
  },
  attachHint: {
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    marginLeft: 2,
  },
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
    gap: 10,
  },
  attachmentThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  attachmentFileIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontFamily: "Inter_500Medium",
  },
  attachmentSize: {
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  attachmentRemove: {
    padding: 4,
  },
  analyzeButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  analyzeButtonText: { fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  quickTests: { gap: 10 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  quickTestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickTestText: { flex: 1, fontFamily: "Inter_400Regular", lineHeight: 18 },
  resultCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  riskBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 14,
  },
  riskInfo: { flex: 1 },
  riskLabel: { fontFamily: "Inter_700Bold" },
  riskScore: { fontFamily: "Inter_500Medium", marginTop: 2 },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: { fontSize: 18, fontFamily: "Inter_700Bold" },
  resultBody: { padding: 20, gap: 4 },
  resultSectionTitle: { fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  recommendation: { fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  explanation: { fontFamily: "Inter_400Regular", lineHeight: 23 },
  patternRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  patternText: { fontFamily: "Inter_400Regular", flex: 1 },
  layerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  layerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  layerScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    minWidth: 42,
    alignItems: "center",
  },
  layerScoreText: { fontFamily: "Inter_700Bold" },
  layerName: { fontFamily: "Inter_500Medium", flex: 1 },
  layerFindings: { marginTop: 10, gap: 6, paddingLeft: 4 },
  findingRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  findingDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  findingText: { fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },
  noFindings: { marginTop: 8, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  entitiesCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  entityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  entityLabel: { fontFamily: "Inter_600SemiBold", width: 55 },
  entityValue: { fontFamily: "Inter_400Regular", flex: 1 },
  alertFamilySection: { marginTop: 20 },
  alertFamilyBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  alertFamilyBtnText: { fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  alertSentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#D1FAE5",
    borderRadius: 12,
    padding: 14,
  },
  alertSentText: { fontFamily: "Inter_600SemiBold", color: "#059669", flex: 1 },
  feedbackSection: { marginTop: 20, gap: 10 },
  feedbackTitle: { fontFamily: "Inter_500Medium" },
  feedbackButtons: { flexDirection: "row", gap: 10 },
  feedbackBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedbackBtnText: { fontFamily: "Inter_600SemiBold" },
  feedbackThankYou: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  feedbackThanks: { fontFamily: "Inter_600SemiBold" },
  analyzeAnotherBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  analyzeAnotherText: { fontFamily: "Inter_500Medium" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  helpModal: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  helpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  helpTitle: {
    fontFamily: "Inter_700Bold",
  },
  helpStep: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  helpStepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 26,
    overflow: "hidden",
    flexShrink: 0,
  },
  helpStepContent: {
    flex: 1,
    gap: 3,
  },
  helpStepTitle: {
    fontFamily: "Inter_600SemiBold",
  },
  helpStepDesc: {
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  helpCloseBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  helpCloseBtnText: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
});
