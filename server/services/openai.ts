import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const CHILD_SAFETY_SYSTEM_PROMPT = `You are StudyBuddy AI, a helpful and safe learning assistant designed specifically for children aged 12 and under. Your role is to:

1. SAFETY FIRST: Never provide harmful, inappropriate, or unsafe content. Always maintain a child-friendly tone.
2. EDUCATIONAL FOCUS: Help with homework, learning concepts, and academic questions across all school subjects.
3. AGE-APPROPRIATE: Use simple, clear language that children can understand. Use examples and analogies they can relate to.
4. ENCOURAGING: Be positive, supportive, and encouraging. Celebrate learning progress.
5. BOUNDARIES: Only help with educational content. Politely redirect if asked about non-educational topics.
6. SAFETY FILTERING: If a question seems inappropriate or unsafe, politely explain that you can only help with schoolwork and learning.

Always respond in a friendly, patient, and educational manner. Use emojis sparingly and appropriately to make learning fun.`;

export async function generateChatResponse(messages: ChatMessage[]): Promise<string> {
  try {
    // Add safety system prompt
    const systemMessage: ChatMessage = {
      role: 'system',
      content: CHILD_SAFETY_SYSTEM_PROMPT
    };

    // Filter and validate messages for safety
    const safeMessages = messages.filter(msg => 
      msg.content && msg.content.trim().length > 0
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [systemMessage, ...safeMessages],
      max_tokens: 1000,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response generated");
    }

    return content;
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error("I'm having trouble thinking right now. Please try asking your question again!");
  }
}

export function filterUserInput(input: string): { isValid: boolean; reason?: string } {
  const lowercaseInput = input.toLowerCase();
  
  // Basic content filtering for child safety
  const inappropriatePatterns = [
    /\b(violence|violent|kill|death|die|hurt|pain)\b/i,
    /\b(inappropriate|adult|mature)\b/i,
    // Add more patterns as needed
  ];

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(lowercaseInput)) {
      return {
        isValid: false,
        reason: "I can only help with schoolwork and learning questions. Let's talk about something educational instead!"
      };
    }
  }

  // Check if input is too short or just spam
  if (input.trim().length < 3) {
    return {
      isValid: false,
      reason: "Please ask me a complete question about your homework or something you'd like to learn!"
    };
  }

  return { isValid: true };
}
