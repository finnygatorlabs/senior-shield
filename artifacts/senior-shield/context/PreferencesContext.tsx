import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { TEXT_SIZES, TextSizes } from "@/constants/textSizes";

export const DEFAULT_NAMES: Record<string, string> = { female: "Ava", male: "Max" };

export type FontSize = "normal" | "large" | "extra_large";
export type ColorScheme = "light" | "dark";
export type VoiceGender = "female" | "male";
export type TtsVoice = "nova" | "shimmer" | "sage" | "echo" | "ash" | "onyx";

// All available voices with display names and descriptions
export const TTS_VOICES: { value: TtsVoice; label: string; gender: VoiceGender; description: string }[] = [
  { value: "nova",    label: "Nova",    gender: "female", description: "Warm & friendly" },
  { value: "shimmer", label: "Shimmer", gender: "female", description: "Soft & gentle" },
  { value: "sage",    label: "Sage",    gender: "female", description: "Calm & collected" },
  { value: "echo",    label: "Echo",    gender: "male",   description: "Energetic & upbeat" },
  { value: "ash",     label: "Ash",     gender: "male",   description: "Smooth & soulful" },
  { value: "onyx",    label: "Onyx",    gender: "male",   description: "Deep & authoritative" },
];

export interface Preferences {
  preferred_voice: VoiceGender;
  tts_voice: TtsVoice;
  voice_speed: number;
  voice_volume: number;
  color_scheme: ColorScheme;
  high_contrast_enabled: boolean;
  font_size: FontSize;
  haptic_feedback: boolean;
  captions_enabled: boolean;
  data_collection_enabled: boolean;
  assistant_name: string;
}

const DEFAULT_PREFS: Preferences = {
  preferred_voice: "female",
  tts_voice: "nova",
  voice_speed: 1.0,
  voice_volume: 0.8,
  color_scheme: "light",
  high_contrast_enabled: false,
  font_size: "large",
  haptic_feedback: true,
  captions_enabled: true,
  data_collection_enabled: true,
  assistant_name: "Ava",
};

interface PreferencesContextType {
  prefs: Preferences;
  loaded: boolean;
  ts: TextSizes;
  updatePref: (key: keyof Preferences, value: any) => Promise<void>;
  reloadPrefs: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType>({
  prefs: DEFAULT_PREFS,
  loaded: false,
  ts: TEXT_SIZES.large,
  updatePref: async () => {},
  reloadPrefs: async () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  const reloadPrefs = useCallback(async () => {
    if (!user?.token) return;
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "http://localhost:8080";
      const res = await fetch(`${base}/api/user/preferences`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (!data.error) {
        const gender: VoiceGender = data.preferred_voice === "male" ? "male" : "female";
        setPrefs({
          preferred_voice: gender,
          voice_speed: parseFloat(data.voice_speed) || 1.0,
          voice_volume: parseFloat(data.voice_volume) || 0.8,
          color_scheme: data.color_scheme === "dark" ? "dark" : "light",
          high_contrast_enabled: !!data.high_contrast_enabled,
          font_size: (["normal", "large", "extra_large"].includes(data.font_size)
            ? data.font_size
            : "large") as FontSize,
          haptic_feedback: data.haptic_feedback !== false,
          captions_enabled: data.captions_enabled !== false,
          data_collection_enabled: data.data_collection_enabled !== false,
          assistant_name: data.assistant_name || DEFAULT_NAMES[gender],
          tts_voice: (data.tts_voice as TtsVoice) || (gender === "female" ? "nova" : "echo"),
        });
      }
    } catch {}
    setLoaded(true);
  }, [user?.token]);

  useEffect(() => {
    if (user?.token) {
      reloadPrefs();
    } else {
      setPrefs(DEFAULT_PREFS);
      setLoaded(false);
    }
  }, [user?.token]);

  const updatePref = useCallback(async (key: keyof Preferences, value: any) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    if (!user?.token) return;
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "http://localhost:8080";
      await fetch(`${base}/api/user/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {}
  }, [user?.token]);

  const ts = TEXT_SIZES[prefs.font_size] ?? TEXT_SIZES.large;

  return (
    <PreferencesContext.Provider value={{ prefs, loaded, ts, updatePref, reloadPrefs }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
