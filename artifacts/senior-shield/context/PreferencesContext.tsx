import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

export const DEFAULT_NAMES: Record<string, string> = { female: "Aria", male: "Max" };

export type FontSize = "normal" | "large" | "extra_large";
export type ColorScheme = "light" | "dark";
export type VoiceGender = "female" | "male";

export interface Preferences {
  preferred_voice: VoiceGender;
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
  voice_speed: 1.0,
  voice_volume: 0.8,
  color_scheme: "light",
  high_contrast_enabled: false,
  font_size: "large",
  haptic_feedback: true,
  captions_enabled: true,
  data_collection_enabled: true,
  assistant_name: "Aria",
};

interface PreferencesContextType {
  prefs: Preferences;
  loaded: boolean;
  fontScale: number;
  updatePref: (key: keyof Preferences, value: any) => Promise<void>;
  reloadPrefs: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType>({
  prefs: DEFAULT_PREFS,
  loaded: false,
  fontScale: 1.15,
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
      const base = domain ? `https://${domain}` : "";
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
          font_size: (["normal", "large", "extra_large"].includes(data.font_size) ? data.font_size : "large") as FontSize,
          haptic_feedback: data.haptic_feedback !== false,
          captions_enabled: data.captions_enabled !== false,
          data_collection_enabled: data.data_collection_enabled !== false,
          assistant_name: data.assistant_name || DEFAULT_NAMES[gender],
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
      const base = domain ? `https://${domain}` : "";
      await fetch(`${base}/api/user/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {}
  }, [user?.token]);

  const fontScale = prefs.font_size === "extra_large" ? 1.35 : prefs.font_size === "large" ? 1.15 : 1.0;

  return (
    <PreferencesContext.Provider value={{ prefs, loaded, fontScale, updatePref, reloadPrefs }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
