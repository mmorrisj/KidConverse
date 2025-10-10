import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Chat, User } from "@shared/schema";
import { ObjectUploader } from "../ObjectUploader";
import QuizSelector from "../QuizSelector";
import type { UploadResult } from "@uppy/core";
import { Mic, MicOff, Send, Upload } from "lucide-react";

// Extend the Window interface to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface MessageInputProps {
  chatId: string | null;
  currentUser: User;
  onChatCreated?: (chat: Chat) => void;
  onStreamingUpdate?: (content: string, isStreaming: boolean) => void; // Added callback for streaming updates
}

export default function MessageInput({ chatId, currentUser, onChatCreated, onStreamingUpdate }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Speech recognition states
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Placeholder for setError, assuming it's defined elsewhere or meant to be added
  const [error, setError] = useState<string>("");
  // Placeholder for setIsLoading, assuming it's defined elsewhere or meant to be added
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // State for handling file uploads within the input component
  const [content, setContent] = useState<string>(""); // Renamed from 'message' for clarity in handleSubmit
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onstart = () => {
          setIsListening(true);
        };
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setMessage(prev => {
            const newMessage = prev + (prev ? ' ' : '') + transcript;
            // Trigger auto-resize after state update
            setTimeout(() => autoResizeTextarea(), 0);
            return newMessage;
          });
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error !== 'aborted') {
            toast({
              title: "Voice input error",
              description: "Could not recognize speech. Please try again.",
              variant: "destructive",
            });
          }
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [toast]);

  // Auto-resize textarea function
  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max height of ~3-4 lines
      textarea.style.height = `${newHeight}px`;
    }
  };

  // Handle message change with auto-resize
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    autoResizeTextarea();
  };

  // Auto-resize when message changes
  useEffect(() => {
    autoResizeTextarea();
  }, [message]);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast({
          title: "Voice input unavailable",
          description: "Could not start voice input. Please type your question.",
          variant: "destructive",
        });
      }
    }
  };

  const createChatMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/chats", {
        title,
        userId: currentUser.id
      });
      return response.json();
    },
    onSuccess: (chat: Chat) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      onChatCreated?.(chat);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
    },
  });

  // This mutation is now largely replaced by the direct fetch in sendMessage,
  // but we keep it for potential future use or if other parts of the app rely on it.
  // However, the core logic for sending a message and handling streaming is in sendMessage.
  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content, imageUrl }: { chatId: string; content: string; imageUrl?: string }) => {
      setIsLoading(true); // Ensure loading state is managed
      // The actual streaming logic is handled within the sendMessage function below,
      // which replaces the direct fetch call here. This mutation might become redundant.
      // For now, we'll just return a placeholder or the original fetch if needed.

      // Directly calling the updated sendMessage logic here to ensure consistency.
      // This might need refactoring depending on how tanstack-query should interact with streaming.
      await sendMessage(content, undefined, imageUrl); // Passing imageUrl as undefined because it's handled within sendMessage
      return { success: true }; // Placeholder return
    },
    onSuccess: () => {
      // Invalidation is now handled within the sendMessage function after streaming is complete.
      // queryClient.invalidateQueries({ queryKey: ['/api/chats', chatId, 'messages'] });
      // queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      setMessage("");
      setUploadedImageUrl(null);
      setIsLoading(false); // Ensure loading state is reset
    },
    onError: (error: Error) => {
      setIsLoading(false); // Ensure loading state is reset
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    const messageContent = message.trim();
    if (!messageContent && !uploadedImageUrl) return; // Allow sending just an image

    if (!chatId) {
      // Create new chat first
      const title = messageContent.length > 50 ? messageContent.substring(0, 47) + "..." : messageContent;
      const newChat = await createChatMutation.mutateAsync(title);

      // Send message to new chat
      // Use the direct sendMessage function for streaming
      await sendMessage(messageContent, undefined, uploadedImageUrl || undefined, newChat.id);
    } else {
      // Send message to existing chat
      // Use the direct sendMessage function for streaming
      await sendMessage(messageContent, undefined, uploadedImageUrl || undefined, chatId);
    }
    // Clear message and image after attempting to send
    setMessage("");
    setUploadedImageUrl(null);
  };

  const handleImageUpload = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload");
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to prepare image upload",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      setUploadedImageUrl(uploadedFile.uploadURL || null);
      toast({
        title: "Success",
        description: "Image uploaded! Now you can ask me to check your work.",
      });
    }
  };

  const removeImage = () => {
    setUploadedImageUrl(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // This function is the core of the streaming logic.
  // It replaces the previous direct fetch in the old sendMessageMutation.
  const sendMessage = async (messageContent: string, imageFile?: File, imageUrl?: string, targetChatId?: string) => {
    const activeChatId = targetChatId || chatId;
    if (!messageContent.trim() && !imageUrl) return; // Allow sending just an image

    try {
      setIsLoading(true);
      setError(""); // Clear previous errors

      // If no chat exists, create one first
      let currentChatId = activeChatId;
      if (!currentChatId) {
        const title = messageContent.length > 50 ? messageContent.substring(0, 47) + "..." : messageContent;
        const newChatResponse = await apiRequest("POST", "/api/chats", {
          title,
          userId: currentUser.id,
        });

        if (!newChatResponse.ok) {
          const error = await newChatResponse.json();
          throw new Error(error.message || "Failed to create chat");
        }

        const newChat = await newChatResponse.json();
        currentChatId = newChat.id;
        onChatCreated?.(newChat); // Callback to update parent state if needed
      }

      // Send message with streaming support
      const response = await fetch(`/api/chats/${currentChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent, imageUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        onStreamingUpdate?.('', true); // Start streaming
        let streamingContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'aiChunk') {
                  streamingContent += data.chunk;
                  onStreamingUpdate?.(streamingContent, true);
                } else if (data.type === 'complete') {
                  onStreamingUpdate?.('', false); // End streaming
                  // Invalidate and refetch queries when complete
                  await queryClient.invalidateQueries({
                    queryKey: ['/api/chats', currentChatId, 'messages']
                  });
                  await queryClient.invalidateQueries({
                    queryKey: ['/api/chats']
                  });
                }
              } catch (e) {
                console.error('Error parsing streaming data:', e);
              }
            }
          }
        }
      }

    } catch (error) {
      console.error("Failed to send message:", error);
      setError(error instanceof Error ? error.message : "Failed to send message");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      onStreamingUpdate?.('', false); // Ensure streaming is marked as false on error
    } finally {
      setIsLoading(false);
      // Clear form fields after a successful or failed send attempt
      setMessage("");
      setImageFile(null);
      setUploadedImageUrl(null); // Also clear the uploaded image URL
      setImagePreview(null);
    }
  };

  const handleQuizSelect = (topic: string, question: string) => {
    setMessage(question);
    autoResizeTextarea();
    // Auto-submit the quiz question
    setTimeout(() => {
      handleSubmit();
    }, 100);
  };

  const isSubmitting = createChatMutation.isPending || isLoading; // Use isLoading from the sendMessage function

  return (
    <div className="bg-white border-t border-gray-200 p-3 sm:p-4 sticky bottom-0 z-10 shadow-lg">
      <div className="max-w-4xl mx-auto">
        {/* Typing Indicator */}
        {isTyping && ( // This isTyping might need to be managed based on the sendMessage's isLoading state
          <div className="mb-4 flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>StudyBuddy is thinking...</span>
          </div>
        )}

        {/* Image Preview */}
        {uploadedImageUrl && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <i className="fas fa-image text-study-blue text-sm"></i>
                <span className="text-xs sm:text-sm text-gray-700">Homework photo attached</span>
              </div>
              <button
                onClick={removeImage}
                className="text-gray-500 hover:text-red-500 transition-colors p-2 touch-manipulation"
                aria-label="Remove image"
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end space-x-2 sm:space-x-4">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              placeholder={uploadedImageUrl ? "Ask me to check your work..." : isListening ? "Listening... Speak your question" : "Ask me anything about your homework..."}
              className="resize-none border border-gray-300 rounded-xl px-3 sm:px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-study-blue focus:border-transparent placeholder-gray-500 min-h-[48px] sm:min-h-[52px] max-h-[120px] overflow-y-auto transition-all duration-200"
              rows={1}
              disabled={isSubmitting}
              style={{ height: '48px' }}
              onInput={autoResizeTextarea}
            />
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Voice Input Button */}
            {speechSupported && (
              <Button
                onClick={toggleSpeechRecognition}
                disabled={isSubmitting}
                className={`p-2 sm:p-3 rounded-xl transition-colors duration-200 flex items-center justify-center min-w-[44px] sm:min-w-[52px] h-[44px] sm:h-[52px] touch-manipulation ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                title={isListening ? "Stop listening" : "Start voice input"}
                aria-label={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>
            )}

            <QuizSelector
              currentUser={currentUser}
              onQuizSelect={handleQuizSelect}
            />

            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10485760}
              onGetUploadParameters={handleImageUpload}
              onComplete={handleUploadComplete}
              buttonClassName="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 sm:p-3 rounded-xl transition-colors duration-200 flex items-center justify-center min-w-[44px] sm:min-w-[52px] h-[44px] sm:h-[52px] touch-manipulation"
            >
              <i className="fas fa-camera text-base sm:text-lg"></i>
            </ObjectUploader>

            <Button
              onClick={handleSubmit}
              disabled={!message.trim() && !uploadedImageUrl || isSubmitting}
              className="bg-study-blue hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 sm:p-3 rounded-xl transition-colors duration-200 flex items-center justify-center min-w-[44px] sm:min-w-[52px] h-[44px] sm:h-[52px] touch-manipulation"
              aria-label="Send message"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Input Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 sm:mt-3 text-xs text-gray-500 gap-2">
          <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto">
            <div className="flex items-center space-x-1 flex-shrink-0">
              <i className="fas fa-shield-alt text-green-600"></i>
              <span className="hidden xs:inline">Safe & Monitored</span>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <i className="fas fa-graduation-cap text-study-blue"></i>
              <span className="hidden xs:inline">Educational Use Only</span>
            </div>
            {speechSupported && (
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Mic className="w-3 h-3 text-study-blue" />
                <span className="hidden sm:inline">Voice Input Available</span>
              </div>
            )}
          </div>
          <span className="hidden sm:inline text-right flex-shrink-0">Press Enter to send, Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}