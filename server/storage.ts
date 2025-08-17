import { type User, type InsertUser, type Chat, type InsertChat, type Message, type InsertMessage, type SolStandard, type AssessmentItem, type AssessmentAttempt, type InsertSolStandard, type InsertAssessmentItem, type InsertAssessmentAttempt } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  createChat(chat: InsertChat): Promise<Chat>;
  getChats(userId?: string): Promise<Chat[]>;
  getChatsByUserId(userId: string): Promise<Chat[]>;
  getChat(id: string): Promise<Chat | undefined>;
  updateChat(id: string, updates: Partial<Chat>): Promise<Chat | undefined>;
  deleteChat(id: string): Promise<boolean>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(chatId: string): Promise<Message[]>;
  getMessagesByChatId(chatId: string): Promise<Message[]>;
  deleteMessages(chatId: string): Promise<boolean>;
  
  // SOL Standards methods
  getSolStandards(subject?: string, grade?: string): Promise<SolStandard[]>;
  createSolStandard(standard: InsertSolStandard): Promise<SolStandard>;
  getSolStandardById(id: string): Promise<SolStandard | undefined>;
  
  // Assessment Items methods
  createAssessmentItem(item: InsertAssessmentItem): Promise<AssessmentItem>;
  getAssessmentItem(id: string): Promise<AssessmentItem | undefined>;
  
  // Assessment Attempts methods
  createAssessmentAttempt(attempt: InsertAssessmentAttempt): Promise<AssessmentAttempt>;
  getAssessmentAttemptsByUser(userId: string): Promise<AssessmentAttempt[]>;
  getMasteryByUser(userId: string): Promise<Record<string, { ewma: number; count: number; lastAttempt: string }>>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private chats: Map<string, Chat>;
  private messages: Map<string, Message>;
  private solStandards: Map<string, SolStandard>;
  private assessmentItems: Map<string, AssessmentItem>;
  private assessmentAttempts: Map<string, AssessmentAttempt>;

  constructor() {
    this.users = new Map();
    this.chats = new Map();
    this.messages = new Map();
    this.solStandards = new Map();
    this.assessmentItems = new Map();
    this.assessmentAttempts = new Map();
    this.initializeSolStandards();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = randomUUID();
    const now = new Date();
    const chat: Chat = { 
      ...insertChat, 
      id, 
      createdAt: now,
      updatedAt: now,
      userId: insertChat.userId || ""
    };
    this.chats.set(id, chat);
    return chat;
  }

  async getChats(userId?: string): Promise<Chat[]> {
    return Array.from(this.chats.values())
      .filter(chat => !userId || chat.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getChatsByUserId(userId: string): Promise<Chat[]> {
    return Array.from(this.chats.values())
      .filter(chat => chat.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getChat(id: string): Promise<Chat | undefined> {
    return this.chats.get(id);
  }

  async updateChat(id: string, updates: Partial<Chat>): Promise<Chat | undefined> {
    const chat = this.chats.get(id);
    if (!chat) return undefined;
    
    const updatedChat = { 
      ...chat, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.chats.set(id, updatedChat);
    return updatedChat;
  }

  async deleteChat(id: string): Promise<boolean> {
    const deleted = this.chats.delete(id);
    if (deleted) {
      // Also delete all messages for this chat
      await this.deleteMessages(id);
    }
    return deleted;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage, 
      id, 
      createdAt: new Date(),
      imageUrl: insertMessage.imageUrl || null
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.chatId === chatId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getMessagesByChatId(chatId: string): Promise<Message[]> {
    return this.getMessages(chatId);
  }

  async deleteMessages(chatId: string): Promise<boolean> {
    const messagesToDelete = Array.from(this.messages.values())
      .filter(message => message.chatId === chatId);
    
    messagesToDelete.forEach(message => {
      this.messages.delete(message.id);
    });
    
    return true;
  }

  // Initialize SOL Standards from JSON file
  private async initializeSolStandards(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const solFile = path.join(process.cwd(), 'SOL', 'standards.json');
      const solData = await fs.readFile(solFile, 'utf-8');
      const standards = JSON.parse(solData);

      // Load standards for all subjects and grades
      for (const subject of Object.keys(standards)) {
        for (const grade of Object.keys(standards[subject])) {
          for (const standardKey of Object.keys(standards[subject][grade])) {
            const standard = standards[subject][grade][standardKey];
            const solStandard: SolStandard = {
              id: randomUUID(),
              code: standardKey,
              subject: subject,
              grade: grade,
              title: standard.title || standardKey,
              description: standard.description || standard.title || '',
              strands: standard.strands || [],
              createdAt: new Date(),
              updatedAt: new Date()
            };
            this.solStandards.set(solStandard.id, solStandard);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load SOL standards:', error);
    }
  }

  // SOL Standards methods
  async getSolStandards(subject?: string, grade?: string): Promise<SolStandard[]> {
    let standards = Array.from(this.solStandards.values());
    
    if (subject) {
      standards = standards.filter(s => s.subject.toLowerCase() === subject.toLowerCase());
    }
    
    if (grade) {
      standards = standards.filter(s => s.grade === grade);
    }
    
    return standards;
  }

  async createSolStandard(standard: InsertSolStandard): Promise<SolStandard> {
    const newStandard: SolStandard = {
      id: randomUUID(),
      ...standard,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.solStandards.set(newStandard.id, newStandard);
    return newStandard;
  }

  async getSolStandardById(id: string): Promise<SolStandard | undefined> {
    return this.solStandards.get(id);
  }

  // Assessment Items methods
  async createAssessmentItem(item: InsertAssessmentItem): Promise<AssessmentItem> {
    const newItem: AssessmentItem = {
      id: randomUUID(),
      ...item,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.assessmentItems.set(newItem.id, newItem);
    return newItem;
  }

  async getAssessmentItem(id: string): Promise<AssessmentItem | undefined> {
    return this.assessmentItems.get(id);
  }

  // Assessment Attempts methods
  async createAssessmentAttempt(attempt: InsertAssessmentAttempt): Promise<AssessmentAttempt> {
    const newAttempt: AssessmentAttempt = {
      id: randomUUID(),
      ...attempt,
      createdAt: new Date(),
    };
    
    this.assessmentAttempts.set(newAttempt.id, newAttempt);
    return newAttempt;
  }

  async getAssessmentAttemptsByUser(userId: string): Promise<AssessmentAttempt[]> {
    return Array.from(this.assessmentAttempts.values())
      .filter(attempt => attempt.userId === userId);
  }

  async getMasteryByUser(userId: string): Promise<Record<string, { ewma: number; count: number; lastAttempt: string }>> {
    const attempts = await this.getAssessmentAttemptsByUser(userId);
    const masteryData: Record<string, { ewma: number; count: number; lastAttempt: string }> = {};

    attempts.forEach(attempt => {
      const key = attempt.standardId;
      if (!masteryData[key]) {
        masteryData[key] = { ewma: 0, count: 0, lastAttempt: attempt.createdAt.toISOString() };
      }
      
      const alpha = 0.3; // EWMA decay factor
      const score = attempt.isCorrect ? 1 : 0;
      
      if (masteryData[key].count === 0) {
        masteryData[key].ewma = score;
      } else {
        masteryData[key].ewma = alpha * score + (1 - alpha) * masteryData[key].ewma;
      }
      
      masteryData[key].count++;
      masteryData[key].lastAttempt = attempt.createdAt.toISOString();
    });

    return masteryData;
  }
}

// Database storage implementation  
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { users } = await import("@shared/schema");
    
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { users } = await import("@shared/schema");
    
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    
    return await db.select().from(users);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async createChat(chatData: InsertChat): Promise<Chat> {
    const { db } = await import("./db");
    const { chats } = await import("@shared/schema");
    
    const [chat] = await db.insert(chats).values(chatData).returning();
    return chat;
  }

  async getChats(userId?: string): Promise<Chat[]> {
    const { db } = await import("./db");
    const { eq, desc } = await import("drizzle-orm");
    const { chats } = await import("@shared/schema");
    
    if (userId) {
      return await db.select().from(chats).where(eq(chats.userId, userId)).orderBy(desc(chats.updatedAt));
    }
    return await db.select().from(chats).orderBy(desc(chats.updatedAt));
  }

  async getChatsByUserId(userId: string): Promise<Chat[]> {
    const { db } = await import("./db");
    const { eq, desc } = await import("drizzle-orm");
    const { chats } = await import("@shared/schema");
    
    return await db.select().from(chats).where(eq(chats.userId, userId)).orderBy(desc(chats.updatedAt));
  }

  async getChat(id: string): Promise<Chat | undefined> {
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { chats } = await import("@shared/schema");
    
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    return chat || undefined;
  }

  async updateChat(id: string, updates: Partial<Chat>): Promise<Chat | undefined> {
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { chats } = await import("@shared/schema");
    
    const [chat] = await db.update(chats).set({...updates, updatedAt: new Date()}).where(eq(chats.id, id)).returning();
    return chat || undefined;
  }

  async deleteChat(id: string): Promise<boolean> {
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { chats } = await import("@shared/schema");
    
    const result = await db.delete(chats).where(eq(chats.id, id));
    return (result.rowCount || 0) > 0;
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const { db } = await import("./db");
    const { messages } = await import("@shared/schema");
    
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    const { db } = await import("./db");
    const { eq, asc } = await import("drizzle-orm");
    const { messages } = await import("@shared/schema");
    
    return await db.select().from(messages).where(eq(messages.chatId, chatId)).orderBy(asc(messages.createdAt));
  }

  async getMessagesByChatId(chatId: string): Promise<Message[]> {
    return this.getMessages(chatId);
  }

  async deleteMessages(chatId: string): Promise<boolean> {
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { messages } = await import("@shared/schema");
    
    const result = await db.delete(messages).where(eq(messages.chatId, chatId));
    return (result.rowCount || 0) > 0;
  }

  // SOL Standards methods
  async getSolStandards(subject?: string, grade?: string): Promise<SolStandard[]> {
    const { db } = await import("./db");
    const { eq, and } = await import("drizzle-orm");
    const { solStandards } = await import("@shared/schema");
    
    let query = db.select().from(solStandards);
    
    const conditions = [];
    if (subject) {
      conditions.push(eq(solStandards.subject, subject));
    }
    if (grade) {
      conditions.push(eq(solStandards.grade, grade));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query;
  }

  async createSolStandard(standardData: InsertSolStandard): Promise<SolStandard> {
    const { db } = await import("./db");
    const { solStandards } = await import("@shared/schema");
    
    const [standard] = await db.insert(solStandards).values(standardData).returning();
    return standard;
  }

  async getSolStandardById(id: string): Promise<SolStandard | undefined> {
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { solStandards } = await import("@shared/schema");
    
    const [standard] = await db.select().from(solStandards).where(eq(solStandards.id, id));
    return standard || undefined;
  }

  // Assessment Items methods
  async createAssessmentItem(itemData: InsertAssessmentItem): Promise<AssessmentItem> {
    const { db } = await import("./db");
    const { assessmentItems } = await import("@shared/schema");
    
    const [item] = await db.insert(assessmentItems).values(itemData).returning();
    return item;
  }

  async getAssessmentItem(id: string): Promise<AssessmentItem | undefined> {
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { assessmentItems } = await import("@shared/schema");
    
    const [item] = await db.select().from(assessmentItems).where(eq(assessmentItems.id, id));
    return item || undefined;
  }

  // Assessment Attempts methods
  async createAssessmentAttempt(attemptData: InsertAssessmentAttempt): Promise<AssessmentAttempt> {
    const { db } = await import("./db");
    const { assessmentAttempts } = await import("@shared/schema");
    
    const [attempt] = await db.insert(assessmentAttempts).values(attemptData).returning();
    return attempt;
  }

  async getAssessmentAttemptsByUser(userId: string): Promise<AssessmentAttempt[]> {
    const { db } = await import("./db");
    const { eq, desc } = await import("drizzle-orm");
    const { assessmentAttempts } = await import("@shared/schema");
    
    return await db.select().from(assessmentAttempts).where(eq(assessmentAttempts.userId, userId)).orderBy(desc(assessmentAttempts.createdAt));
  }

  async getMasteryByUser(userId: string): Promise<Record<string, { ewma: number; count: number; lastAttempt: string }>> {
    const attempts = await this.getAssessmentAttemptsByUser(userId);
    const masteryData: Record<string, { ewma: number; count: number; lastAttempt: string }> = {};

    attempts.forEach(attempt => {
      const key = attempt.standardId;
      if (!masteryData[key]) {
        masteryData[key] = { ewma: 0, count: 0, lastAttempt: attempt.createdAt.toISOString() };
      }
      
      const alpha = 0.3; // EWMA decay factor
      const score = attempt.isCorrect ? 1 : 0;
      
      if (masteryData[key].count === 0) {
        masteryData[key].ewma = score;
      } else {
        masteryData[key].ewma = alpha * score + (1 - alpha) * masteryData[key].ewma;
      }
      
      masteryData[key].count++;
      masteryData[key].lastAttempt = attempt.createdAt.toISOString();
    });

    return masteryData;
  }
}

export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();