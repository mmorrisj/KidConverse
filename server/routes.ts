import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateChatResponse, generateChatResponseStream, filterUserInput } from "./services/openai";
import OpenAI from "openai";
import { insertChatSchema, insertMessageSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { 
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
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

  // Get all chats for a user
  app.get("/api/chats", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      const chats = await storage.getChatsByUserId(userId);
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

  // Send a message and get AI response (streaming)
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

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

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

      // Send user message first
      res.write(`data: ${JSON.stringify({ 
        type: 'userMessage', 
        message: userMessage 
      })}\n\n`);

      // Generate AI response with streaming
      let aiResponseContent = '';
      await generateChatResponseStream(conversationHistory, user, (chunk: string) => {
        aiResponseContent += chunk;
        res.write(`data: ${JSON.stringify({ 
          type: 'aiChunk', 
          chunk: chunk,
          content: aiResponseContent
        })}\n\n`);
      });

      // Save complete AI message
      const aiMessage = await storage.createMessage({
        chatId,
        content: aiResponseContent,
        role: 'assistant'
      });

      // Update chat title if this is the first message
      if (messages.length <= 1) {
        const title = content.length > 50 ? content.substring(0, 47) + "..." : content;
        await storage.updateChat(chatId, { title });
      }

      // Update chat's updatedAt timestamp
      await storage.updateChat(chatId, { updatedAt: new Date() });

      // Send final message with complete data
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        aiMessage: aiMessage
      })}\n\n`);

      res.end();
    } catch (error) {
      console.error("Error processing message:", error);
      if (!res.headersSent) {
        res.status(500).json({ 
          message: "I'm having trouble thinking right now. Please try asking your question again!" 
        });
      }
    }
  });

  // Quiz generation endpoint
  app.post("/api/quiz/generate", async (req, res) => {
    try {
      const quizRequestSchema = z.object({
        topic: z.string(),
        grade: z.string(),
        age: z.number(),
        name: z.string()
      });

      const { topic, grade, age, name } = quizRequestSchema.parse(req.body);
      
      if (!openai) {
        return res.status(503).json({ message: "AI service not available" });
      }

      const gradeLevel = grade === "K" ? "Kindergarten" : `Grade ${grade}`;
      
      const systemPrompt = `You are StudyBuddy AI, a friendly educational assistant for children aged 12 and under. 

Generate ONE engaging quiz question for ${name} (age ${age}, ${gradeLevel}) on the topic of ${topic}.

REQUIREMENTS:
- Make it appropriate for a ${gradeLevel} student
- Include clear, simple instructions
- Make it educational and fun
- Use age-appropriate language
- If it's multiple choice, provide 3-4 clear options
- If it's open-ended, give helpful hints

Format your response as a complete question that I can ask directly to the student. Be encouraging and use their name when appropriate.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a ${topic} quiz question for me!` }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const question = completion.choices[0]?.message?.content || 
        `Here's a ${topic} question for you, ${name}! What would you like to learn about ${topic} today?`;

      res.json({ question });
    } catch (error) {
      console.error("Quiz generation error:", error);
      res.status(500).json({ message: "Failed to generate quiz question" });
    }
  });

  // ===== SOL ASSESSMENT ROUTES =====
  
  // Get SOL Standards with optional filtering
  app.get("/api/sol/standards", async (req, res) => {
    try {
      const { subject, grade } = req.query;
      const standards = await storage.getSolStandards(
        subject as string, 
        grade as string
      );
      res.json(standards);
    } catch (error) {
      console.error("Error fetching SOL standards:", error);
      res.status(500).json({ message: "Failed to fetch SOL standards" });
    }
  });

  // Get specific SOL standard
  app.get("/api/sol/standards/:id", async (req, res) => {
    try {
      const standard = await storage.getSolStandardById(req.params.id);
      if (!standard) {
        return res.status(404).json({ message: "Standard not found" });
      }
      res.json(standard);
    } catch (error) {
      console.error("Error fetching SOL standard:", error);
      res.status(500).json({ message: "Failed to fetch SOL standard" });
    }
  });

  // Generate assessment item with AI
  app.post("/api/sol/generate-item", async (req, res) => {
    try {
      if (!openai) {
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }

      const { standardId, itemType, difficulty, userId } = req.body;
      
      // Validate input
      if (!standardId || !itemType || !userId) {
        return res.status(400).json({ message: "Missing required fields: standardId, itemType, userId" });
      }

      // Get the SOL standard
      const standard = await storage.getSolStandardById(standardId);
      if (!standard) {
        return res.status(404).json({ message: "Standard not found" });
      }

      // Get user for grade-appropriate content
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate AI prompt based on item type and standard
      let systemPrompt = `You are an expert educational assessment creator specializing in Virginia Standards of Learning (SOL) aligned questions.

Create a ${difficulty || 'medium'} difficulty ${itemType} question for Grade ${user.grade} students aligned to:
Standard: ${standard.code}
Subject: ${standard.subject}  
Title: ${standard.title}
Description: ${standard.description}

Requirements:
- Age-appropriate language for Grade ${user.grade} students (ages ${user.age || (parseInt(user.grade) + 5)})
- Academically rigorous and pedagogically sound
- Clear, unambiguous wording
- Aligned to the specific SOL standard

Response format must be valid JSON matching this structure:`;

      if (itemType === 'MCQ') {
        systemPrompt += `
{
  "question": "Clear question text",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correct_answer": "A",
  "explanation": "Why this is correct and others are wrong"
}`;
      } else if (itemType === 'FIB') {
        systemPrompt += `
{
  "question": "Question with __blank__ to fill in",
  "correct_answers": ["acceptable answer 1", "acceptable answer 2"],
  "explanation": "What makes a good answer"
}`;
      } else if (itemType === 'CR') {
        systemPrompt += `
{
  "question": "Open-ended question requiring detailed response",
  "rubric": {
    "excellent": "4 points criteria",
    "good": "3 points criteria", 
    "satisfactory": "2 points criteria",
    "needs_improvement": "1 point criteria"
  },
  "sample_answer": "Example of excellent response"
}`;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a ${itemType} question for: ${standard.title}` }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const generatedContent = completion.choices[0]?.message?.content;
      if (!generatedContent) {
        return res.status(500).json({ message: "Failed to generate question content" });
      }

      // Parse the AI response - handle markdown code blocks
      let questionData;
      try {
        let cleanContent = generatedContent;
        // Remove markdown code blocks and extra text
        const jsonMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanContent = jsonMatch[1];
        } else {
          // Try to extract JSON from the text
          const jsonStart = cleanContent.indexOf('{');
          const jsonEnd = cleanContent.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            cleanContent = cleanContent.slice(jsonStart, jsonEnd + 1);
          }
        }
        
        questionData = JSON.parse(cleanContent.trim());
      } catch (parseError) {
        console.error("Failed to parse AI response:", generatedContent);
        return res.status(500).json({ message: "Failed to parse generated question" });
      }

      // Create assessment item record
      const assessmentItem = await storage.createAssessmentItem({
        standardId: standardId,
        itemType: itemType,
        difficulty: difficulty || 'medium',
        question: questionData.question,
        options: questionData.options || null,
        correctAnswer: questionData.correct_answer || questionData.correct_answers?.[0] || null,
        acceptableAnswers: questionData.correct_answers || null,
        rubric: questionData.rubric || null,
        explanation: questionData.explanation || questionData.sample_answer || null,
        metadata: {
          generatedBy: 'openai-gpt4o',
          userGrade: user.grade,
          userAge: user.age,
          timestamp: new Date().toISOString()
        }
      });

      res.json(assessmentItem);
    } catch (error) {
      console.error("Error generating assessment item:", error);
      res.status(500).json({ 
        message: "Failed to generate assessment item",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Submit assessment attempt
  app.post("/api/sol/submit-attempt", async (req, res) => {
    try {
      if (!openai) {
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }

      const { itemId, userId, response } = req.body;
      
      // Validate input
      if (!itemId || !userId || response === undefined) {
        return res.status(400).json({ message: "Missing required fields: itemId, userId, response" });
      }

      // Get the assessment item and user
      const [item, user] = await Promise.all([
        storage.getAssessmentItem(itemId),
        storage.getUser(userId)
      ]);

      if (!item || !user) {
        return res.status(404).json({ message: "Item or user not found" });
      }

      let isCorrect = false;
      let score = 0;
      let maxScore = 0;
      let feedback = "";

      // Score the response based on item type
      if (item.itemType === 'MCQ') {
        maxScore = 1;
        isCorrect = response === item.correctAnswer;
        score = isCorrect ? 1 : 0;
        feedback = item.explanation || "";
      } else if (item.itemType === 'FIB') {
        maxScore = 1;
        const acceptable = item.acceptableAnswers || [item.correctAnswer];
        isCorrect = acceptable.some(answer => 
          answer && response.toLowerCase().trim().includes(answer.toLowerCase().trim())
        );
        score = isCorrect ? 1 : 0;
        feedback = item.explanation || "";
      } else if (item.itemType === 'CR') {
        // Use AI to score constructed response
        maxScore = 4;
        const scoringPrompt = `Score this student response using the provided rubric.

Question: ${item.question}

Rubric:
${JSON.stringify(item.rubric, null, 2)}

Student Response: ${response}

Provide a score from 1-4 and brief feedback. Respond with JSON:
{
  "score": <number 1-4>,
  "feedback": "<encouraging feedback with specific suggestions>",
  "isCorrect": <true if score >= 3, false otherwise>
}`;

        const scoringCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a fair and encouraging teacher scoring student responses." },
            { role: "user", content: scoringPrompt }
          ],
          temperature: 0.3,
          max_tokens: 300
        });

        try {
          let scoringContent = scoringCompletion.choices[0]?.message?.content || "{}";
          // Remove markdown code blocks and extra text
          const jsonMatch = scoringContent.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            scoringContent = jsonMatch[1];
          } else {
            // Try to extract JSON from the text
            const jsonStart = scoringContent.indexOf('{');
            const jsonEnd = scoringContent.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
              scoringContent = scoringContent.slice(jsonStart, jsonEnd + 1);
            }
          }
          
          const scoringResult = JSON.parse(scoringContent.trim());
          score = scoringResult.score || 1;
          isCorrect = scoringResult.isCorrect || score >= 3;
          feedback = scoringResult.feedback || "Good effort! Keep working on this topic.";
        } catch (error) {
          console.error("Error parsing scoring result:", error);
          score = 2;
          isCorrect = false;
          feedback = "Your response has been received. Keep practicing!";
        }
      }

      // Create assessment attempt record
      const attempt = await storage.createAssessmentAttempt({
        itemId: itemId,
        userId: userId,
        standardId: item.standardId,
        response: response,
        isCorrect: isCorrect,
        score: score,
        maxScore: maxScore,
        timeSpent: req.body.timeSpent || 0,
        metadata: {
          itemType: item.itemType,
          difficulty: item.difficulty,
          timestamp: new Date().toISOString()
        }
      });

      res.json({
        id: attempt.id,
        is_correct: isCorrect,
        score: score,
        max_score: maxScore,
        feedback: feedback,
        explanation: item.explanation
      });
    } catch (error) {
      console.error("Error submitting assessment attempt:", error);
      res.status(500).json({ 
        message: "Failed to submit attempt",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get user mastery data
  app.get("/api/sol/mastery/:userId", async (req, res) => {
    try {
      const mastery = await storage.getMasteryByUser(req.params.userId);
      res.json(mastery);
    } catch (error) {
      console.error("Error fetching mastery data:", error);
      res.status(500).json({ message: "Failed to fetch mastery data" });
    }
  });

  // Get user's assessment history
  app.get("/api/sol/attempts/:userId", async (req, res) => {
    try {
      const attempts = await storage.getAssessmentAttemptsByUser(req.params.userId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching assessment attempts:", error);
      res.status(500).json({ message: "Failed to fetch attempts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
