import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/senior-shield`;

interface Message {
  role: string;
  content: string;
}

interface Session {
  id: string;
  started_at: string;
  expires_at: string;
  messages: Message[];
}

interface DateGroup {
  label: string;
  sessions: Session[];
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function groupByDate(sessions: Session[]): DateGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const map = new Map<string, Session[]>();
  for (const s of sessions) {
    const d = new Date(s.started_at);
    d.setHours(0, 0, 0, 0);
    const key = d.toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }

  const groups: DateGroup[] = [];
  for (const [key, items] of map) {
    const d = new Date(key);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    groups.push({ label, sessions: items });
  }

  return groups.sort(
    (a, b) =>
      new Date(b.sessions[0].started_at).getTime() -
      new Date(a.sessions[0].started_at).getTime()
  );
}

function ConversationCard({
  session,
  theme,
  ts,
}: {
  session: Session;
  theme: any;
  ts: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const userMsgs = session.messages.filter((m) => m.role === "user");
  const assistantMsgs = session.messages.filter((m) => m.role === "assistant");
  const preview = userMsgs[0]?.content || "Conversation";

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.cardHeader}
        hitSlop={6}
      >
        <View style={styles.cardMeta}>
          <Text style={[styles.cardTime, { color: theme.textSecondary, fontSize: ts.xs }]}>
            {formatTime(session.started_at)}
          </Text>
          <Text style={[styles.cardCount, { color: theme.textSecondary, fontSize: ts.xs }]}>
            {userMsgs.length} {userMsgs.length === 1 ? "question" : "questions"}
          </Text>
        </View>
        <View style={styles.cardPreviewRow}>
          <Text
            style={[styles.cardPreview, { color: theme.text, fontSize: ts.sm }]}
            numberOfLines={expanded ? undefined : 2}
          >
            {preview}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
            style={{ marginLeft: 8, marginTop: 2 }}
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={[styles.cardBody, { borderTopColor: theme.border }]}>
          {session.messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <View
                key={idx}
                style={[
                  styles.msgRow,
                  isUser ? styles.msgRowUser : styles.msgRowAssistant,
                ]}
              >
                {!isUser && (
                  <View style={[styles.avatarIcon, { backgroundColor: "#2563EB" }]}>
                    <Ionicons name="sparkles" size={11} color="#FFF" />
                  </View>
                )}
                <View
                  style={[
                    styles.msgBubble,
                    isUser
                      ? styles.userBubble
                      : [styles.asstBubble, { backgroundColor: theme.surface, borderColor: theme.cardBorder }],
                  ]}
                >
                  <Text
                    style={{
                      color: isUser ? "#FFF" : theme.text,
                      fontFamily: "Inter_400Regular",
                      fontSize: ts.sm,
                      lineHeight: ts.sm * 1.5,
                    }}
                  >
                    {msg.content}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const { theme, ts } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(
    async (isRefresh = false) => {
      if (!user?.token) return;
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/conversations`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!res.ok) throw new Error("Failed to load history");
        const data = await res.json();
        setSessions(data);
      } catch {
        setError("Couldn't load your conversation history. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [fetchSessions])
  );

  const groups = groupByDate(sessions);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={[styles.loadingText, { color: theme.textSecondary, fontSize: ts.sm }]}>
            Loading your conversations…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontSize: ts.base }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => fetchSessions()}
            style={[styles.retryBtn, { backgroundColor: "#2563EB" }]}
          >
            <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: ts.base }}>
              Try Again
            </Text>
          </Pressable>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubble-ellipses-outline" size={56} color={theme.textSecondary} />
          <Text
            style={[styles.emptyTitle, { color: theme.text, fontSize: ts.lg }]}
          >
            No conversations yet
          </Text>
          <Text
            style={[styles.emptyText, { color: theme.textSecondary, fontSize: ts.base }]}
          >
            Your conversations with your assistant will appear here so you can read them
            again any time.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: tabBarHeight + insets.bottom + 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchSessions(true);
              }}
              tintColor="#2563EB"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {groups.map((group) => (
            <View key={group.label}>
              <Text
                style={[styles.dateLabel, { color: theme.textSecondary, fontSize: ts.xs }]}
              >
                {group.label}
              </Text>
              {group.sessions.map((session) => (
                <ConversationCard
                  key={session.id}
                  session={session}
                  theme={theme}
                  ts={ts}
                />
              ))}
            </View>
          ))}
          <Text
            style={[styles.retentionNote, { color: theme.textSecondary, fontSize: ts.xs }]}
          >
            Conversations are saved for 30 days
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    marginTop: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginTop: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  retryBtn: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 6,
  },
  dateLabel: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardHeader: {
    padding: 14,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardTime: {
    fontFamily: "Inter_500Medium",
  },
  cardCount: {
    fontFamily: "Inter_400Regular",
  },
  cardPreviewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardPreview: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  cardBody: {
    borderTopWidth: 1,
    padding: 12,
    gap: 8,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  msgRowUser: {
    justifyContent: "flex-end",
  },
  msgRowAssistant: {
    justifyContent: "flex-start",
    gap: 6,
  },
  avatarIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  msgBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "82%",
  },
  userBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  asstBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  retentionNote: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
});
