/**
 * Hybrid storage implementation that uses SQLAlchemy via Python service
 * This bridges the Node.js application with the Python SQLAlchemy ORM
 */
import { IStorage } from './storage';
import type { User, Chat, Message, SolStandard, AssessmentItem, AssessmentAttempt } from '@shared/schema';

const PYTHON_DB_SERVICE_URL = process.env.PYTHON_DB_SERVICE_URL || 'http://localhost:5001';

export class HybridSQLAlchemyStorage implements IStorage {
  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${PYTHON_DB_SERVICE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API call failed: ${response.status} ${error}`);
    }

    return response.json();
  }

  // User operations
  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    return this.apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      return await this.apiCall(`/users/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return this.apiCall('/users');
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    return this.apiCall(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await this.apiCall(`/users/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Chat operations
  async createChat(chatData: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat> {
    return this.apiCall('/chats', {
      method: 'POST',
      body: JSON.stringify(chatData),
    });
  }

  async getChatsByUserId(userId: string): Promise<Chat[]> {
    return this.apiCall(`/chats?userId=${encodeURIComponent(userId)}`);
  }

  async getChatById(id: string): Promise<Chat | null> {
    try {
      return await this.apiCall(`/chats/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async updateChat(id: string, updates: Partial<Chat>): Promise<Chat | null> {
    return this.apiCall(`/chats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteChat(id: string): Promise<boolean> {
    try {
      await this.apiCall(`/chats/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Message operations
  async createMessage(messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    return this.apiCall('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async getMessagesByChatId(chatId: string): Promise<Message[]> {
    return this.apiCall(`/messages?chatId=${encodeURIComponent(chatId)}`);
  }

  async deleteMessage(id: string): Promise<boolean> {
    try {
      await this.apiCall(`/messages/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      return false;
    }
  }

  // SOL Standards operations
  async createSolStandard(standardData: SolStandard): Promise<SolStandard> {
    return this.apiCall('/sol/standards', {
      method: 'POST',
      body: JSON.stringify(standardData),
    });
  }

  async getSolStandardsBySubjectGrade(subject: string, grade: string): Promise<SolStandard[]> {
    return this.apiCall(`/sol/standards?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`);
  }

  async getSolStandardById(id: string): Promise<SolStandard | null> {
    try {
      return await this.apiCall(`/sol/standards/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getAllSolStandards(): Promise<SolStandard[]> {
    return this.apiCall('/sol/standards');
  }

  // Assessment Item operations
  async createAssessmentItem(itemData: Omit<AssessmentItem, 'id' | 'createdAt'>): Promise<AssessmentItem> {
    return this.apiCall('/assessment/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  async getAssessmentItemById(id: string): Promise<AssessmentItem | null> {
    try {
      return await this.apiCall(`/assessment/items/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // Assessment Attempt operations
  async createAssessmentAttempt(attemptData: Omit<AssessmentAttempt, 'id' | 'createdAt'>): Promise<AssessmentAttempt> {
    return this.apiCall('/assessment/attempts', {
      method: 'POST',
      body: JSON.stringify(attemptData),
    });
  }

  async getUserMasteryData(userId: string): Promise<any> {
    return this.apiCall(`/mastery/${userId}`);
  }

  // Email operations (these will remain unchanged for now)
  async scheduleEmail(emailData: any): Promise<void> {
    // Email functionality remains in Node.js
    console.log('Email scheduling not yet migrated to SQLAlchemy service');
  }

  async getScheduledEmails(): Promise<any[]> {
    return [];
  }

  async markEmailAsSent(emailId: string): Promise<void> {
    console.log('Email marking not yet migrated to SQLAlchemy service');
  }
}