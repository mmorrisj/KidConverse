/**
 * ORM-style models for StudyBuddy AI database
 * Provides SQLAlchemy-like interface for TypeScript
 */
import { DatabaseStorage } from './storage';
import type { User, Chat, Message, SolStandard, AssessmentItem, AssessmentAttempt } from '@shared/schema';

export abstract class BaseModel {
  protected static storage: DatabaseStorage;
  
  static setStorage(storage: DatabaseStorage) {
    this.storage = storage;
  }
}

export class UserModel extends BaseModel {
  static async create(data: Omit<User, 'id'>): Promise<User> {
    return this.storage.createUser(data);
  }
  
  static async findById(id: string): Promise<User | null> {
    return this.storage.getUserById(id);
  }
  
  static async findAll(): Promise<User[]> {
    return this.storage.getAllUsers();
  }
  
  static async update(id: string, data: Partial<User>): Promise<User | null> {
    return this.storage.updateUser(id, data);
  }
  
  static async delete(id: string): Promise<boolean> {
    return this.storage.deleteUser(id);
  }
  
  static async findByEmail(email: string): Promise<User | null> {
    const users = await this.findAll();
    return users.find(user => user.email === email) || null;
  }
  
  static async findByGrade(grade: string): Promise<User[]> {
    const users = await this.findAll();
    return users.filter(user => user.grade === grade);
  }
}

export class ChatModel extends BaseModel {
  static async create(data: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat> {
    return this.storage.createChat(data);
  }
  
  static async findById(id: string): Promise<Chat | null> {
    return this.storage.getChatById(id);
  }
  
  static async findByUserId(userId: string): Promise<Chat[]> {
    return this.storage.getChatsByUserId(userId);
  }
  
  static async update(id: string, data: Partial<Chat>): Promise<Chat | null> {
    return this.storage.updateChat(id, data);
  }
  
  static async delete(id: string): Promise<boolean> {
    return this.storage.deleteChat(id);
  }
  
  static async findRecent(userId: string, limit: number = 10): Promise<Chat[]> {
    const chats = await this.findByUserId(userId);
    return chats.slice(0, limit);
  }
}

export class MessageModel extends BaseModel {
  static async create(data: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    return this.storage.createMessage(data);
  }
  
  static async findByChatId(chatId: string): Promise<Message[]> {
    return this.storage.getMessagesByChatId(chatId);
  }
  
  static async delete(id: string): Promise<boolean> {
    return this.storage.deleteMessage(id);
  }
  
  static async findByRole(chatId: string, role: 'user' | 'assistant'): Promise<Message[]> {
    const messages = await this.findByChatId(chatId);
    return messages.filter(msg => msg.role === role);
  }
  
  static async getConversationHistory(chatId: string): Promise<Array<{role: string; content: string}>> {
    const messages = await this.findByChatId(chatId);
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }
}

export class SolStandardModel extends BaseModel {
  static async create(data: SolStandard): Promise<SolStandard> {
    return this.storage.createSolStandard(data);
  }
  
  static async findById(id: string): Promise<SolStandard | null> {
    return this.storage.getSolStandardById(id);
  }
  
  static async findBySubjectAndGrade(subject: string, grade: string): Promise<SolStandard[]> {
    return this.storage.getSolStandardsBySubjectGrade(subject, grade);
  }
  
  static async findAll(): Promise<SolStandard[]> {
    return this.storage.getAllSolStandards();
  }
  
  static async findBySubject(subject: string): Promise<SolStandard[]> {
    const standards = await this.findAll();
    return standards.filter(std => std.subject.toLowerCase() === subject.toLowerCase());
  }
  
  static async findByGrade(grade: string): Promise<SolStandard[]> {
    const standards = await this.findAll();
    return standards.filter(std => std.grade === grade);
  }
  
  static async findByStrand(strand: string): Promise<SolStandard[]> {
    const standards = await this.findAll();
    return standards.filter(std => std.strand.toLowerCase().includes(strand.toLowerCase()));
  }
  
  static async createBulk(standards: SolStandard[]): Promise<SolStandard[]> {
    const results: SolStandard[] = [];
    for (const standard of standards) {
      try {
        const existing = await this.findById(standard.id);
        if (!existing) {
          const created = await this.create(standard);
          results.push(created);
        } else {
          results.push(existing);
        }
      } catch (error) {
        console.error(`Failed to create standard ${standard.id}:`, error);
      }
    }
    return results;
  }
}

export class AssessmentItemModel extends BaseModel {
  static async create(data: Omit<AssessmentItem, 'id' | 'createdAt'>): Promise<AssessmentItem> {
    return this.storage.createAssessmentItem(data);
  }
  
  static async findById(id: string): Promise<AssessmentItem | null> {
    return this.storage.getAssessmentItemById(id);
  }
  
  static async findBySolId(solId: string): Promise<AssessmentItem[]> {
    // This would need to be implemented in the storage layer
    // For now, return empty array
    return [];
  }
  
  static async findByType(itemType: 'MCQ' | 'FIB' | 'CR'): Promise<AssessmentItem[]> {
    // This would need to be implemented in the storage layer
    return [];
  }
  
  static async findByDifficulty(difficulty: string): Promise<AssessmentItem[]> {
    // This would need to be implemented in the storage layer
    return [];
  }
  
  static async generateForStandard(
    standardId: string, 
    itemType: 'MCQ' | 'FIB' | 'CR', 
    difficulty: string = 'medium'
  ): Promise<AssessmentItem> {
    // This integrates with the AI generation logic
    const standard = await SolStandardModel.findById(standardId);
    if (!standard) {
      throw new Error(`Standard ${standardId} not found`);
    }
    
    // Generate using existing AI logic (this would be moved here)
    throw new Error('AI generation logic needs to be integrated');
  }
}

export class AssessmentAttemptModel extends BaseModel {
  static async create(data: Omit<AssessmentAttempt, 'id' | 'createdAt'>): Promise<AssessmentAttempt> {
    return this.storage.createAssessmentAttempt(data);
  }
  
  static async findByUserId(userId: string): Promise<AssessmentAttempt[]> {
    // This would need to be implemented in the storage layer
    return [];
  }
  
  static async findByItemId(itemId: string): Promise<AssessmentAttempt[]> {
    // This would need to be implemented in the storage layer
    return [];
  }
  
  static async findBySolId(solId: string): Promise<AssessmentAttempt[]> {
    // This would need to be implemented in the storage layer
    return [];
  }
  
  static async getUserMastery(userId: string): Promise<any> {
    return this.storage.getUserMasteryData(userId);
  }
  
  static async calculateEWMA(attempts: AssessmentAttempt[], alpha: number = 0.3): Promise<number> {
    if (attempts.length === 0) return 0;
    
    let ewma = attempts[0].score / attempts[0].maxScore;
    
    for (let i = 1; i < attempts.length; i++) {
      const normalizedScore = attempts[i].score / attempts[i].maxScore;
      ewma = alpha * normalizedScore + (1 - alpha) * ewma;
    }
    
    return ewma;
  }
  
  static async submitAnswer(
    itemId: string,
    userId: string,
    response: string,
    timeSpent: number = 0
  ): Promise<{attempt: AssessmentAttempt; isCorrect: boolean; feedback: string}> {
    const item = await AssessmentItemModel.findById(itemId);
    if (!item) {
      throw new Error(`Assessment item ${itemId} not found`);
    }
    
    // Score the response (this logic would be moved here)
    throw new Error('Scoring logic needs to be integrated');
  }
}

// ORM Session manager
export class ORMSession {
  private storage: DatabaseStorage;
  
  constructor(storage: DatabaseStorage) {
    this.storage = storage;
    
    // Set storage for all models
    UserModel.setStorage(storage);
    ChatModel.setStorage(storage);
    MessageModel.setStorage(storage);
    SolStandardModel.setStorage(storage);
    AssessmentItemModel.setStorage(storage);
    AssessmentAttemptModel.setStorage(storage);
  }
  
  get User() { return UserModel; }
  get Chat() { return ChatModel; }
  get Message() { return MessageModel; }
  get SolStandard() { return SolStandardModel; }
  get AssessmentItem() { return AssessmentItemModel; }
  get AssessmentAttempt() { return AssessmentAttemptModel; }
  
  async beginTransaction() {
    // Transaction support would be implemented here
    console.log('Transaction support not yet implemented');
  }
  
  async commit() {
    // Commit transaction
    console.log('Transaction commit not yet implemented');
  }
  
  async rollback() {
    // Rollback transaction
    console.log('Transaction rollback not yet implemented');
  }
}

// Factory function to create ORM session
export function createORMSession(storage: DatabaseStorage): ORMSession {
  return new ORMSession(storage);
}