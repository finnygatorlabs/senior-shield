import AsyncStorage from "@react-native-async-storage/async-storage";

const getApiBase = () => {
  const d = process.env.EXPO_PUBLIC_DOMAIN;
  if (d) return `https://${d}`;
  return "http://localhost:8080";
};

const API_BASE = getApiBase();
const STORAGE_KEY = "seniorshield_user";

type SessionListener = () => void;
const sessionExpiredListeners: SessionListener[] = [];

export const apiEvents = {
  onSessionExpired(fn: SessionListener) {
    sessionExpiredListeners.push(fn);
    return () => {
      const idx = sessionExpiredListeners.indexOf(fn);
      if (idx >= 0) sessionExpiredListeners.splice(idx, 1);
    };
  },
  emitSessionExpired() {
    sessionExpiredListeners.forEach((fn) => fn());
  },
};

async function getToken(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.token || null;
    }
  } catch {}
  return null;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  token?: string | null;
  signal?: AbortSignal;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, signal, skipAuth = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const authToken = token ?? (skipAuth ? null : await getToken());
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal,
  };
  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  const url = `${API_BASE}/api${path}`;
  const response = await fetch(url, fetchOptions);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && !skipAuth) {
      apiEvents.emitSessionExpired();
    }
    const message = data?.message || data?.error || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}


export const authApi = {
  login(email: string, password: string) {
    return request("/auth/login", { method: "POST", body: { email, password }, skipAuth: true });
  },

  signup(data: { email: string; password: string; user_type: string; first_name?: string; last_name?: string }) {
    return request("/auth/signup", { method: "POST", body: data, skipAuth: true });
  },

  googleLogin(accessToken: string, userType = "senior") {
    return request("/auth/google", { method: "POST", body: { access_token: accessToken, user_type: userType }, skipAuth: true });
  },

  refreshToken(token: string) {
    return request("/auth/refresh-token", { method: "POST", body: { token }, skipAuth: true });
  },

  changePassword(currentPassword: string, newPassword: string, token?: string) {
    return request("/auth/change-password", { method: "POST", body: { current_password: currentPassword, new_password: newPassword }, token });
  },

  deleteAccount(token?: string) {
    return request("/auth/account", { method: "DELETE", token });
  },
};


export const voiceApi = {
  processRequest(requestText: string, conversationHistory: { role: string; content: string }[], token?: string) {
    return request("/voice/process-request", {
      method: "POST",
      body: { request_text: requestText, conversation_history: conversationHistory },
      token,
    });
  },

  tts(text: string, voice: string, token?: string, signal?: AbortSignal) {
    return request("/voice/tts", {
      method: "POST",
      body: { text: text.slice(0, 600), voice },
      token,
      signal,
    });
  },

  getHistory(page = 1, limit = 20, token?: string) {
    return request(`/voice/history?page=${page}&limit=${limit}`, { token });
  },

  getDetail(id: string, token?: string) {
    return request(`/voice/history/${id}`, { token });
  },

  sendFeedback(id: string, rating: number, comment?: string, token?: string) {
    return request("/voice/feedback", { method: "POST", body: { request_id: id, rating, comment }, token });
  },
};


export const scamApi = {
  analyze(text: string, token?: string) {
    return request("/scam/analyze", { method: "POST", body: { text }, token });
  },

  async analyzeWithAttachment(formData: FormData, token?: string) {
    const authToken = token || (await getToken());
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/api/scam/analyze-attachment`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data);
    }
    return res.json();
  },

  sendFeedback(scamAnalysisId: string, feedbackType: string, token?: string) {
    return request("/scam/feedback", { method: "POST", body: { scam_analysis_id: scamAnalysisId, feedback_type: feedbackType }, token });
  },

  getHistory(page = 1, limit = 20, token?: string) {
    return request(`/scam/history?page=${page}&limit=${limit}`, { token });
  },

  getDetail(id: string, token?: string) {
    return request(`/scam/history/${id}`, { token });
  },

  getLibrary(token?: string) {
    return request("/scam/library", { token });
  },

  report(text: string, scamType: string, token?: string) {
    return request("/scam/report", { method: "POST", body: { text, scam_type: scamType }, token });
  },
};


export const familyApi = {
  getMembers(token?: string) {
    return request("/family/members", { token });
  },

  addMember(adultChildEmail: string, relationship: string, token?: string) {
    return request("/family/add-member", { method: "POST", body: { adult_child_email: adultChildEmail, relationship }, token });
  },

  removeMember(id: string, token?: string) {
    return request(`/family/member/${id}`, { method: "DELETE", token });
  },

  getAlerts(token?: string) {
    return request("/alerts", { token });
  },

  markAlertRead(alertId: string, token?: string) {
    return request(`/alerts/${alertId}`, { method: "PUT", body: { status: "read" }, token });
  },
};


export const conversationApi = {
  list(token?: string) {
    return request("/conversations", { token });
  },

  create(messages: { role: string; content: string }[], token?: string) {
    return request("/conversations", { method: "POST", body: { messages }, token });
  },

  update(id: string, messages: { role: string; content: string }[], token?: string) {
    return request(`/conversations/${id}`, { method: "PUT", body: { messages }, token });
  },

  delete(id: string, token?: string) {
    return request(`/conversations/${id}`, { method: "DELETE", token });
  },
};


export const billingApi = {
  createCheckout(plan: string, token?: string) {
    return request("/billing/create-checkout", { method: "POST", body: { plan }, token });
  },

  getSubscription(token?: string) {
    return request("/billing/subscription", { token });
  },

  updateSubscription(plan: string, token?: string) {
    return request("/billing/subscription", { method: "PUT", body: { plan }, token });
  },

  cancelSubscription(token?: string) {
    return request("/billing/subscription", { method: "DELETE", token });
  },

  getInvoices(token?: string) {
    return request("/billing/invoices", { token });
  },

  getTrialStatus(token?: string) {
    return request("/billing/trial-status", { token });
  },
};


export const remindersApi = {
  getPresets() {
    return request("/reminders/presets", { skipAuth: true });
  },

  getAll(token?: string) {
    return request("/reminders", { token });
  },

  getActive(token?: string) {
    return request("/reminders/active", { token });
  },

  add(data: { reminder_key: string; label: string; prompt: string; icon?: string; is_custom?: boolean; metadata?: any }, token?: string) {
    return request("/reminders", { method: "POST", body: data, token });
  },

  updateMetadata(id: string, metadata: any, token?: string) {
    return request(`/reminders/${id}/metadata`, { method: "PUT", body: { metadata }, token });
  },

  toggle(id: string, is_active: boolean, token?: string) {
    return request(`/reminders/${id}/toggle`, { method: "PUT", body: { is_active }, token });
  },

  remove(id: string, token?: string) {
    return request(`/reminders/${id}`, { method: "DELETE", token });
  },

  respond(id: string, response: string, token?: string) {
    return request(`/reminders/${id}/respond`, { method: "POST", body: { response }, token });
  },
};

export const userApi = {
  getProfile(token?: string) {
    return request("/user/profile", { token });
  },

  updateProfile(data: Record<string, any>, token?: string) {
    return request("/user/profile", { method: "PUT", body: data, token });
  },
};


export const emergencyApi = {
  sendSos(token?: string) {
    return request("/emergency/sos", { method: "POST", body: {}, token });
  },

  notifyFamily(message: string, token?: string) {
    return request("/emergency/notify-family", { method: "POST", body: { message }, token });
  },

  sendAlert(alertType: string, message: string, severity: string, token?: string) {
    return request("/alerts/send", { method: "POST", body: { alert_type: alertType, message, severity }, token });
  },
};


export const supportApi = {
  getFaq() {
    return request("/support/faq", { skipAuth: true });
  },

  getTickets(token?: string) {
    return request("/support/tickets", { token });
  },

  submitTicket(subject: string, message: string, token?: string) {
    return request("/support/create-ticket", { method: "POST", body: { subject, message }, token });
  },
};


export const contactsApi = {
  list(token?: string) {
    return request("/contacts/list", { token });
  },

  get(id: string, token?: string) {
    return request(`/contacts/${id}`, { token });
  },

  add(data: { name: string; phone?: string; email?: string; relationship?: string }, token?: string) {
    return request("/contacts/add", { method: "POST", body: data, token });
  },

  update(id: string, data: Record<string, any>, token?: string) {
    return request(`/contacts/${id}`, { method: "PUT", body: data, token });
  },

  delete(id: string, token?: string) {
    return request(`/contacts/${id}`, { method: "DELETE", token });
  },

  suggestions(token?: string) {
    return request("/contacts/suggestions", { token });
  },
};

export const hearingAidApi = {
  getStatus(token?: string) {
    return request("/hearing-aid/status", { token });
  },

  getSupportedBrands() {
    return request("/hearing-aid/supported-brands", { skipAuth: true });
  },

  connect(data: { brand: string; model: string }, token?: string) {
    return request("/hearing-aid/connect", { method: "POST", body: data, token });
  },

  disconnect(token?: string) {
    return request("/hearing-aid/disconnect", { method: "POST", body: {}, token });
  },

  testConnection(token?: string) {
    return request("/hearing-aid/test-connection", { method: "POST", body: {}, token });
  },

  updateSettings(data: Record<string, any>, token?: string) {
    return request("/hearing-aid/settings", { method: "PUT", body: data, token });
  },
};

export { API_BASE, getToken, request };
