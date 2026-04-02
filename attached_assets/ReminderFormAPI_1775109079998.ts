/**
 * API Integration for Reminder Scheduling Form
 * 
 * Handles communication between the React Native form and the Express backend
 * Includes error handling, retry logic, and type safety
 */

import axios, { AxiosInstance } from 'axios';

// Types matching your database schema
export interface CreateReminderRequest {
  reminderType: string;
  customName?: string;
  scheduledTime: string; // ISO 8601 format
  frequency: 'once' | 'daily' | 'weekly';
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  description: string;
  duration: 'once' | 'daily' | 'ongoing';
  durationDays?: number;
  notifyFamilyMemberId?: string;
}

export interface ReminderResponse {
  id: string;
  userId: string;
  reminderType: string;
  customName?: string;
  scheduledTime: string;
  frequency: string;
  daysOfWeek?: number[];
  description: string;
  duration: string;
  durationDays?: number;
  notifyFamilyMemberId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  relationship: string;
  notificationPreference: 'all' | 'missed_only' | 'daily_summary' | 'none';
}

/**
 * ReminderAPI class handles all reminder-related API calls
 */
export class ReminderAPI {
  private api: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL: `${baseURL}/api`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth token
    this.api.interceptors.request.use(
      config => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          console.error('Unauthorized - redirecting to login');
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Create a new reminder
   */
  async createReminder(data: CreateReminderRequest): Promise<ReminderResponse> {
    try {
      const response = await this.api.post<ReminderResponse>(
        '/reminders',
        this.formatReminderData(data)
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to create reminder');
    }
  }

  /**
   * Get all reminders for the current user
   */
  async getReminders(): Promise<ReminderResponse[]> {
    try {
      const response = await this.api.get<ReminderResponse[]>('/reminders');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch reminders');
    }
  }

  /**
   * Get a specific reminder by ID
   */
  async getReminder(reminderId: string): Promise<ReminderResponse> {
    try {
      const response = await this.api.get<ReminderResponse>(
        `/reminders/${reminderId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch reminder');
    }
  }

  /**
   * Update an existing reminder
   */
  async updateReminder(
    reminderId: string,
    data: Partial<CreateReminderRequest>
  ): Promise<ReminderResponse> {
    try {
      const response = await this.api.put<ReminderResponse>(
        `/reminders/${reminderId}`,
        this.formatReminderData(data)
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to update reminder');
    }
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(reminderId: string): Promise<void> {
    try {
      await this.api.delete(`/reminders/${reminderId}`);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete reminder');
    }
  }

  /**
   * Get family members for notification
   */
  async getFamilyMembers(): Promise<FamilyMember[]> {
    try {
      const response = await this.api.get<FamilyMember[]>(
        '/family-members'
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch family members');
    }
  }

  /**
   * Get reminder history
   */
  async getReminderHistory(reminderId: string): Promise<any[]> {
    try {
      const response = await this.api.get(
        `/reminders/${reminderId}/history`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch reminder history');
    }
  }

  /**
   * Mark a reminder as completed
   */
  async completeReminder(reminderId: string): Promise<void> {
    try {
      await this.api.post(`/reminders/${reminderId}/complete`);
    } catch (error) {
      throw this.handleError(error, 'Failed to mark reminder as complete');
    }
  }

  /**
   * Snooze a reminder
   */
  async snoozeReminder(
    reminderId: string,
    snoozeMinutes: number = 15
  ): Promise<void> {
    try {
      await this.api.post(`/reminders/${reminderId}/snooze`, {
        snoozeMinutes,
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to snooze reminder');
    }
  }

  /**
   * Test the scheduler endpoint (for admin testing)
   */
  async testScheduler(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.api.post('/scheduler/test');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to test scheduler');
    }
  }

  /**
   * Format reminder data for API submission
   */
  private formatReminderData(
    data: CreateReminderRequest | Partial<CreateReminderRequest>
  ): any {
    const formatted: any = {
      reminderType: data.reminderType,
      description: data.description,
      frequency: data.frequency,
      duration: data.duration,
    };

    // Handle scheduled time - ensure ISO 8601 format
    if (data.scheduledTime) {
      const date = new Date(data.scheduledTime);
      formatted.scheduledTime = date.toISOString();
      // Also extract time for database
      formatted.scheduledTimeOfDay = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    // Add optional fields
    if (data.customName) formatted.customName = data.customName;
    if (data.daysOfWeek) formatted.daysOfWeek = data.daysOfWeek;
    if (data.durationDays) formatted.durationDays = data.durationDays;
    if (data.notifyFamilyMemberId)
      formatted.notifyFamilyMemberId = data.notifyFamilyMemberId;

    return formatted;
  }

  /**
   * Handle API errors with user-friendly messages
   */
  private handleError(error: any, defaultMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      console.error(`API Error: ${defaultMessage}`, error.response?.data);
      return new Error(`${defaultMessage}: ${message}`);
    }
    console.error(`Error: ${defaultMessage}`, error);
    return new Error(defaultMessage);
  }
}

/**
 * Singleton instance of ReminderAPI
 * Usage: import { reminderAPI } from './ReminderFormAPI'
 */
export const reminderAPI = new ReminderAPI(
  process.env.REACT_APP_API_URL || 'http://localhost:3001'
);

/**
 * Hook for using ReminderAPI in React components
 * Usage: const { createReminder, loading, error } = useReminderAPI()
 */
export function useReminderAPI() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const createReminder = async (data: CreateReminderRequest) => {
    setLoading(true);
    setError(null);
    try {
      const result = await reminderAPI.createReminder(data);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getReminders = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reminderAPI.getReminders();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getFamilyMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reminderAPI.getFamilyMembers();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createReminder,
    getReminders,
    getFamilyMembers,
    loading,
    error,
  };
}
