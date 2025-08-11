import { type User, type InsertUser, type Chat, type InsertChat, type Message, type InsertMessage } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private chats: Map<string, Chat>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.chats = new Map();
    this.messages = new Map();
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
}
  }

  async createUser(user: InsertUser): Promise<User> {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    
    return await db.select().from(users);
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const { db } = await import("./db");
    const { chats } = await import("@shared/schema");
    
    const [chat] = await db
      .insert(chats)
      .values(insertChat)
      .returning();
    return chat;
  }

  async getChats(userId?: string): Promise<Chat[]> {
    const { db } = await import("./db");
    const { desc, eq } = await import("drizzle-orm");
    const { chats } = await import("@shared/schema");
    
    if (userId) {
      return await db
        .select()
        .from(chats)
        .where(eq(chats.userId, userId))
        .orderBy(desc(chats.updatedAt));
    }
    return await db.select().from(chats).orderBy(desc(chats.updatedAt));
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
    
    const [chat] = await db
      .update(chats)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chats.id, id))
      .returning();
    return chat || undefined;
  }

  async deleteChat(id: string): Promise<boolean> {
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { chats } = await import("@shared/schema");
    
    const result = await db.delete(chats).where(eq(chats.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const { db } = await import("./db");
    const { messages } = await import("@shared/schema");
    
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    const { db } = await import("./db");
    const { eq, asc } = await import("drizzle-orm");
    const { messages } = await import("@shared/schema");
    
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.createdAt));
  }

  async deleteMessages(chatId: string): Promise<boolean> {
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { messages } = await import("@shared/schema");
    
    const result = await db.delete(messages).where(eq(messages.chatId, chatId));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = process.env.NODE_ENV === 'production' 
  ? new DatabaseStorage() 
  : new MemStorage();
