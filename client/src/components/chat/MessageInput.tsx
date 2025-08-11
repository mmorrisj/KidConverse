import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Chat } from "@shared/schema";

interface MessageInputProps {
  chatId: string | null;
  onChatCreated?: (chat: Chat) => void;
}

export default function MessageInput({ chatId, onChatCreated }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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
    mutationFn: async ({ chatId, content }: { chatId: string; content: string }) => {
      setIsTyping(true);
      const response = await apiRequest("POST", `/api/chats/${chatId}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats', chatId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      setMessage("");
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
      sendMessageMutation.mutate({ chatId: newChat.id, content });
    } else {
      // Send message to existing chat
      sendMessageMutation.mutate({ chatId, content });
    }
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

        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your homework..."
              className="resize-none border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-study-blue focus:border-transparent placeholder-gray-500 min-h-[52px] max-h-32"
              rows={1}
              disabled={isLoading}
            />
          </div>
          
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
