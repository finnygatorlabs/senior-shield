import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

if (API_BASE) {
  setBaseUrl(API_BASE);
}

interface User {
  user_id: string;
  token: string;
  user_type: string;
  first_name?: string;
  last_name?: string;
  onboarding_completed: boolean;
  email_verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, userType: string, firstName?: string, lastName?: string) => Promise<void>;
  loginWithGoogle: (accessToken: string, userType?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "seniorshield_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.token) {
      const token = user.token;
      setAuthTokenGetter(() => token);
    } else {
      setAuthTokenGetter(() => null);
    }
  }, [user?.token]);

  async function loadUser() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
    } catch (e) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  async function apiCall(path: string, body: object) {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const base = domain ? `https://${domain}` : "";
    const response = await fetch(`${base}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || "Request failed");
    }
    return data;
  }

  function storeUser(data: any) {
    const userData: User = {
      user_id: data.user_id,
      token: data.token,
      user_type: data.user_type,
      first_name: data.first_name,
      last_name: data.last_name,
      onboarding_completed: data.onboarding_completed,
      email_verified: data.email_verified,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    return userData;
  }

  async function login(email: string, password: string) {
    const data = await apiCall("/auth/login", { email, password });
    storeUser(data);
  }

  async function signup(email: string, password: string, userType: string, firstName?: string, lastName?: string) {
    const data = await apiCall("/auth/signup", {
      email,
      password,
      user_type: userType,
      first_name: firstName,
      last_name: lastName,
    });
    storeUser(data);
  }

  async function loginWithGoogle(accessToken: string, userType?: string) {
    const data = await apiCall("/auth/google", {
      access_token: accessToken,
      user_type: userType || "senior",
    });
    storeUser(data);
  }

  async function logout() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  function updateUser(updates: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, loginWithGoogle, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
