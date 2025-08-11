import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { Message, Chat } from "@shared/schema";

interface ChatMessagesProps {
  chatId: string | null;
  onChatCreated?: (chat: Chat) => void;
}

export default function ChatMessages({ chatId }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['/api/chats', chatId, 'messages'],
    enabled: !!chatId,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!chatId) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-study-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-robot text-study-blue text-2xl"></i>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome to StudyBuddy AI!
          </h3>
          <p className="text-gray-600 mb-4">
            I'm here to help you with your homework and answer questions about school subjects. 
            Start a new chat to begin learning together!
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <i className="fas fa-shield-alt text-green-600"></i>
              <span>Safe & Monitored</span>
            </div>
            <div className="flex items-center space-x-1">
              <i className="fas fa-graduation-cap text-study-blue"></i>
              <span>Educational Focus</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-study-blue border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.length === 0 && (
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-study-green rounded-full flex items-center justify-center flex-shrink-0">
            <i className="fas fa-robot text-white"></i>
          </div>
          <div className="flex-1">
            <div className="bg-ai-msg border border-green-200 rounded-2xl rounded-tl-md p-4 max-w-3xl">
              <p className="text-gray-800 text-base leading-relaxed">
                Hi there! 👋 I'm StudyBuddy, your friendly AI learning assistant. 
                I'm here to help you with your homework and answer any questions you have about school subjects. 
                What would you like to learn about today?
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">StudyBuddy • just now</p>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex items-start space-x-4 ${
            message.role === 'user' ? 'flex-row-reverse' : ''
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            message.role === 'user' 
              ? 'bg-study-blue' 
              : 'bg-study-green'
          }`}>
            <i className={`fas ${
              message.role === 'user' ? 'fa-user' : 'fa-robot'
            } text-white`}></i>
          </div>
          <div className="flex-1">
            <div className={`border rounded-2xl p-4 max-w-3xl ${
              message.role === 'user'
                ? 'bg-user-msg border-blue-200 rounded-tr-md ml-auto'
                : 'bg-ai-msg border-green-200 rounded-tl-md'
            }`}>
              <p className="text-gray-800 text-base leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
            <p className={`text-xs text-gray-500 mt-2 ${
              message.role === 'user' ? 'text-right' : ''
            }`}>
              {message.role === 'user' ? 'You' : 'StudyBuddy'} • {
                new Date(message.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              }
            </p>
          </div>
        </div>
      ))}

      <div ref={messagesEndRef} />
    </div>
  );
}
