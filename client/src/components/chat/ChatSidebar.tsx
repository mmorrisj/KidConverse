import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
import type { Chat, User as UserType } from "@shared/schema";

interface ChatSidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  currentUser?: UserType;
  onLogout?: () => void;
}

export default function ChatSidebar({ 
  chats, 
  selectedChatId, 
  onNewChat, 
  onSelectChat,
  currentUser,
  onLogout
}: ChatSidebarProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-study-blue rounded-xl flex items-center justify-center">
            <i className="fas fa-robot text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">StudyBuddy AI</h1>
            <p className="text-sm text-gray-500">Safe Learning Assistant</p>
          </div>
        </div>
        
        <Button
          onClick={onNewChat}
          className="w-full bg-study-blue hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-xl"
        >
          <i className="fas fa-plus mr-2"></i>
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Recent Chats
        </h2>
        
        <div className="space-y-2">
          {chats.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-comments text-gray-400 text-xl"></i>
              </div>
              <p className="text-sm text-gray-500">No chats yet</p>
              <p className="text-xs text-gray-400 mt-1">Start a conversation to see your chat history</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`p-3 rounded-lg cursor-pointer border transition-all duration-200 ${
                  selectedChatId === chat.id
                    ? 'bg-study-blue/10 border-study-blue/30'
                    : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <i className="fas fa-comments text-study-green mt-1"></i>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {chat.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(chat.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <i className="fas fa-shield-alt text-green-600 mt-0.5"></i>
            <div>
              <p className="text-xs font-medium text-green-800">Safe Learning</p>
              <p className="text-xs text-green-700 mt-1">
                All conversations are monitored for safety
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Footer */}
      {currentUser && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-study-blue text-white text-sm">
                  {currentUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentUser.name}
                </p>
                <p className="text-xs text-gray-500">
                  Grade {currentUser.grade}
                </p>
              </div>
            </div>
            {onLogout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-gray-500 hover:text-red-600"
                title="Switch User"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
