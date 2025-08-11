import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateChatResponse, filterUserInput } from "./services/openai";
import { insertChatSchema, insertMessageSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { 
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // User registration endpoint
  app.post("/api/users/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "A user with this email already exists. Please use a different email." 
        });
      }

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ 
        message: error.message || "Registration failed. Please check your information and try again." 
      });
    }
  });

  // Get user info
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all chats
  app.get("/api/chats", async (req, res) => {
    try {
      const chats = await storage.getChats();
      res.json(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  // Create a new chat
  app.post("/api/chats", async (req, res) => {
    try {
      const data = insertChatSchema.parse(req.body);
      const chat = await storage.createChat(data);
      res.json(chat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid chat data", errors: error.errors });
      } else {
        console.error("Error creating chat:", error);
        res.status(500).json({ message: "Failed to create chat" });
      }
    }
  });

  // Get a specific chat
  app.get("/api/chats/:id", async (req, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      res.json(chat);
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });

  // Delete a chat
  app.delete("/api/chats/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteChat(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Chat not found" });
      }
      res.json({ message: "Chat deleted successfully" });
    } catch (error) {
      console.error("Error deleting chat:", error);
      res.status(500).json({ message: "Failed to delete chat" });
    }
  });

  // Get messages for a chat
  app.get("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.chatId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Get upload URL for object entity
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve objects
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Send a message and get AI response
  app.post("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const { content, imageUrl } = req.body;
      const chatId = req.params.chatId;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Filter user input for safety
      const filterResult = filterUserInput(content);
      if (!filterResult.isValid) {
        return res.status(400).json({ message: filterResult.reason });
      }

      // Verify chat exists
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Process image URL if provided
      let processedImageUrl = null;
      if (imageUrl) {
        const objectStorageService = new ObjectStorageService();
        processedImageUrl = objectStorageService.normalizeObjectEntityPath(imageUrl);
      }

      // Save user message
      const userMessage = await storage.createMessage({
        chatId,
        content: content.trim(),
        role: 'user',
        imageUrl: processedImageUrl
      });

      // Get user info for personalization
      let user = undefined;
      if (chat.userId) {
        user = await storage.getUser(chat.userId);
      }

      // Get conversation history
      const messages = await storage.getMessages(chatId);
      const conversationHistory = messages.map(msg => {
        if (msg.imageUrl) {
          // Create multimodal message for OpenAI
          return {
            role: msg.role as 'user' | 'assistant',
            content: [
              {
                type: 'text' as const,
                text: msg.content
              },
              {
                type: 'image_url' as const,
                image_url: {
                  url: `${process.env.REPL_URL || 'http://localhost:5000'}${msg.imageUrl}`
                }
              }
            ]
          };
        } else {
          return {
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          };
        }
      });

      // Generate AI response with user personalization
      const aiResponse = await generateChatResponse(conversationHistory, user);

      // Save AI message
      const aiMessage = await storage.createMessage({
        chatId,
        content: aiResponse,
        role: 'assistant'
      });

      // Update chat title if this is the first message
      if (messages.length <= 1) {
        const title = content.length > 50 ? content.substring(0, 47) + "..." : content;
        await storage.updateChat(chatId, { title });
      }

      // Update chat's updatedAt timestamp
      await storage.updateChat(chatId, { updatedAt: new Date() });

      res.json({
        userMessage,
        aiMessage
      });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ 
        message: "I'm having trouble thinking right now. Please try asking your question again!" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
