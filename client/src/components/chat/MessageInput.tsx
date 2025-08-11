import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Chat, User } from "@shared/schema";
import { ObjectUploader } from "../ObjectUploader";
import type { UploadResult } from "@uppy/core";

interface MessageInputProps {
  chatId: string | null;
  currentUser: User;
  onChatCreated?: (chat: Chat) => void;
}

export default function MessageInput({ chatId, currentUser, onChatCreated }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Placeholder for setError, assuming it's defined elsewhere or meant to be added
  const [error, setError] = useState<string>(""); 
  // Placeholder for setIsLoading, assuming it's defined elsewhere or meant to be added
  const [isLoading, setIsLoading] = useState<boolean>(false); 

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
    const content = message.trim();
    if (!content && !uploadedImageUrl) return; // Allow sending just an image

    if (!chatId) {
      // Create new chat first
      const title = content.length > 50 ? content.substring(0, 47) + "..." : content;
      const newChat = await createChatMutation.mutateAsync(title);

      // Send message to new chat
      // Use the direct sendMessage function for streaming
      await sendMessage(content, undefined, uploadedImageUrl || undefined, newChat.id);
    } else {
      // Send message to existing chat
      // Use the direct sendMessage function for streaming
      await sendMessage(content, undefined, uploadedImageUrl || undefined, chatId);
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
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // This function is the core of the streaming logic.
  // It replaces the previous direct fetch in the old sendMessageMutation.
  const sendMessage = async (content: string, imageFile?: File, imageUrl?: string, targetChatId?: string) => {
    const activeChatId = targetChatId || chatId;
    if (!content.trim() && !imageUrl) return; // Allow sending just an image

    try {
      setIsLoading(true);
      setError(""); // Clear previous errors

      // If no chat exists, create one first
      let currentChatId = activeChatId;
      if (!currentChatId) {
        const title = content.length > 50 ? content.substring(0, 47) + "..." : content;
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
        body: JSON.stringify({ content, imageUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = ""; // To accumulate the full response if needed

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'chunk') {
                  // Append chunk to the full response
                  fullResponse += data.content;
                  // Note: Displaying this chunk character by character would require
                  // updating a state variable in the parent component or a chat display component.
                  // This function itself doesn't render, so it prepares data for rendering.
                  // For a true typewriter effect, the Chat component would need to receive this streaming data.
                } else if (data.type === 'complete') {
                  // Invalidate and refetch queries when complete
                  await queryClient.invalidateQueries({
                    queryKey: ['/api/chats', currentChatId, 'messages']
                  });
                  await queryClient.invalidateQueries({
                    queryKey: ['/api/chats']
                  });
                }
              } catch (e) {
                // Ignore JSON parse errors or malformed lines
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
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitting = createChatMutation.isPending || isLoading; // Use isLoading from the sendMessage function

  return (
    <div className="bg-white border-t border-gray-200 p-4">
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
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <i className="fas fa-image text-study-blue"></i>
                <span className="text-sm text-gray-700">Homework photo attached</span>
              </div>
              <button
                onClick={removeImage}
                className="text-gray-500 hover:text-red-500 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={uploadedImageUrl ? "Ask me to check your work..." : "Ask me anything about your homework..."}
              className="resize-none border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-study-blue focus:border-transparent placeholder-gray-500 min-h-[52px] max-h-32"
              rows={1}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center space-x-2">
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10485760}
              onGetUploadParameters={handleImageUpload}
              onComplete={handleUploadComplete}
              buttonClassName="bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-xl transition-colors duration-200 flex items-center justify-center min-w-[52px] h-[52px]"
            >
              <i className="fas fa-camera text-lg"></i>
            </ObjectUploader>

            <Button
              onClick={handleSubmit}
              disabled={!message.trim() && !uploadedImageUrl || isSubmitting}
              className="bg-study-blue hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors duration-200 flex items-center justify-center min-w-[52px] h-[52px]"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <i className="fas fa-paper-plane text-lg"></i>
              )}
            </Button>
          </div>
        </div>

        {/* Input Footer */}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <i className="fas fa-shield-alt text-green-600"></i>
              <span>Safe & Monitored</span>
            </div>
            <div className="flex items-center space-x-1">
              <i className="fas fa-graduation-cap text-study-blue"></i>
              <span>Educational Use Only</span>
            </div>
          </div>
          <span>Press Enter to send, Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}