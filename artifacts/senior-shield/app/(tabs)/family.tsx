import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";

interface FamilyMember {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  relationship: string;
  scam_alerts: boolean;
  weekly_summary: boolean;
}

const RELATIONSHIPS = ["Son", "Daughter", "Grandson", "Granddaughter", "Spouse", "Friend", "Caregiver"];

export default function FamilyScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("Daughter");
  const [adding, setAdding] = useState(false);

  async function fetchMembers() {
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      const response = await fetch(`${base}/api/family/members`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await response.json();
      setMembers(data.members || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  async function addMember() {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your family member's email address.");
      return;
    }
    setAdding(true);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      const response = await fetch(`${base}/api/family/add-member`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ adult_child_email: email.trim(), relationship: relationship.toLowerCase() }),
      });
      const data = await response.json();
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAddModal(false);
        setEmail("");
        fetchMembers();
      }
    } catch (err) {
      Alert.alert("Error", "Could not add family member. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(id: string) {
    Alert.alert("Remove family member?", "They will no longer receive your alerts.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const domain = process.env.EXPO_PUBLIC_DOMAIN;
            const base = domain ? `https://${domain}` : "";
            await fetch(`${base}/api/family/member/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${user?.token}` },
            });
            setMembers(prev => prev.filter(m => m.id !== id));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch {}
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => setShowAddModal(true)}
          style={[styles.addButton, { alignSelf: "flex-end", marginBottom: 16 }]}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Add Member</Text>
        </Pressable>

        <View style={[styles.infoCard, { backgroundColor: "#EDE9FE", borderColor: "#C4B5FD" }]}>
          <Ionicons name="shield-checkmark" size={24} color="#7C3AED" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: "#7C3AED" }]}>Protection Network</Text>
            <Text style={[styles.infoText, { color: "#6D28D9" }]}>
              Your family members receive instant alerts for high-risk scams and can help you stay safe.
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#2563EB" style={{ marginTop: 40 }} />
        ) : members.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No family members yet</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Add a family member to start receiving scam protection alerts
            </Text>
            <Pressable
              onPress={() => setShowAddModal(true)}
              style={styles.emptyButton}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add Family Member</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.memberList}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {members.length} {members.length === 1 ? "member" : "members"}
            </Text>
            {members.map(member => (
              <View
                key={member.id}
                style={[styles.memberCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <View style={[styles.avatar, { backgroundColor: "#DBEAFE" }]}>
                  <Text style={styles.avatarText}>
                    {(member.first_name || member.email)[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: theme.text }]}>
                    {member.first_name && member.last_name
                      ? `${member.first_name} ${member.last_name}`
                      : member.email}
                  </Text>
                  <Text style={[styles.memberEmail, { color: theme.textSecondary }]}>{member.email}</Text>
                  <View style={styles.alertBadges}>
                    {member.scam_alerts && (
                      <View style={[styles.badge, { backgroundColor: "#D1FAE5" }]}>
                        <Text style={[styles.badgeText, { color: "#065F46" }]}>Scam Alerts</Text>
                      </View>
                    )}
                    {member.weekly_summary && (
                      <View style={[styles.badge, { backgroundColor: "#DBEAFE" }]}>
                        <Text style={[styles.badgeText, { color: "#1E40AF" }]}>Weekly Summary</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Pressable onPress={() => removeMember(member.id)} style={styles.removeButton}>
                  <Ionicons name="trash-outline" size={20} color={theme.textTertiary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent presentationStyle="pageSheet">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Family Member</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close-circle" size={28} color={theme.textTertiary} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Email Address</Text>
                <View style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <Ionicons name="mail-outline" size={20} color={theme.textTertiary} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="family@example.com"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Relationship</Text>
                <View style={styles.relGrid}>
                  {RELATIONSHIPS.map(rel => (
                    <Pressable
                      key={rel}
                      onPress={() => setRelationship(rel)}
                      style={[
                        styles.relChip,
                        { backgroundColor: theme.inputBackground, borderColor: theme.border },
                        relationship === rel && styles.relChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.relChipText,
                          { color: theme.textSecondary },
                          relationship === rel && styles.relChipTextSelected,
                        ]}
                      >
                        {rel}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.addMemberButton, adding && styles.disabled, pressed && styles.pressed]}
                onPress={addMember}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.addMemberButtonText}>Add to My Family Alerts</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16, paddingTop: 16 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  memberList: { gap: 12 },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#2563EB" },
  memberInfo: { flex: 1, gap: 4 },
  memberName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  memberEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  alertBadges: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  removeButton: { padding: 8 },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modalBody: { paddingHorizontal: 24, gap: 20 },
  field: { gap: 10 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  textInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  relGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  relChipSelected: { borderColor: "#2563EB", backgroundColor: "#DBEAFE" },
  relChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  relChipTextSelected: { color: "#2563EB", fontFamily: "Inter_600SemiBold" },
  addMemberButton: { backgroundColor: "#2563EB", borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  addMemberButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
