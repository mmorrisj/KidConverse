import { type User, type InsertUser, type Chat, type InsertChat, type Message, type InsertMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createChat(chat: InsertChat): Promise<Chat>;
  getChats(userId?: string): Promise<Chat[]>;
  getChat(id: string): Promise<Chat | undefined>;
  updateChat(id: string, updates: Partial<Chat>): Promise<Chat | undefined>;
  deleteChat(id: string): Promise<boolean>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(chatId: string): Promise<Message[]>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = randomUUID();
    const now = new Date();
    const chat: Chat = { 
      ...insertChat, 
      id, 
      createdAt: now,
      updatedAt: now,
      userId: insertChat.userId || null
    };
    this.chats.set(id, chat);
    return chat;
  }

  async getChats(userId?: string): Promise<Chat[]> {
    return Array.from(this.chats.values())
      .filter(chat => !userId || chat.userId === userId)
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
      createdAt: new Date() 
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.chatId === chatId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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

export const storage = new MemStorage();
