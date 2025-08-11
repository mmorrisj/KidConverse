import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Chat } from "@shared/schema";
import { ObjectUploader } from "../ObjectUploader";
import type { UploadResult } from "@uppy/core";

interface MessageInputProps {
  chatId: string | null;
  onChatCreated?: (chat: Chat) => void;
}

export default function MessageInput({ chatId, onChatCreated }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createChatMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/chats", { title });
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

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content, imageUrl }: { chatId: string; content: string; imageUrl?: string }) => {
      setIsTyping(true);
      const response = await apiRequest("POST", `/api/chats/${chatId}/messages`, { content, imageUrl });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats', chatId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      setMessage("");
      setUploadedImageUrl(null);
      setIsTyping(false);
    },
    onError: (error: Error) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    const content = message.trim();
    if (!content) return;

    if (!chatId) {
      // Create new chat first
      const title = content.length > 50 ? content.substring(0, 47) + "..." : content;
      const newChat = await createChatMutation.mutateAsync(title);
      
      // Send message to new chat
      sendMessageMutation.mutate({ chatId: newChat.id, content, imageUrl: uploadedImageUrl || undefined });
    } else {
      // Send message to existing chat
      sendMessageMutation.mutate({ chatId, content, imageUrl: uploadedImageUrl || undefined });
    }
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

  const isLoading = createChatMutation.isPending || sendMessageMutation.isPending;

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Typing Indicator */}
        {isTyping && (
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
              disabled={isLoading}
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
              disabled={!message.trim() || isLoading}
              className="bg-study-blue hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors duration-200 flex items-center justify-center min-w-[52px] h-[52px]"
            >
              {isLoading ? (
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
