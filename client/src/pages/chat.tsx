import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatMessages from "../components/chat/ChatMessages";
import MessageInput from "../components/chat/MessageInput";
import type { Chat, User } from "@shared/schema";

interface ChatPageProps {
  currentUser: User;
}

export default function ChatPage({ currentUser }: ChatPageProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const { data: chats = [], refetch: refetchChats } = useQuery<Chat[]>({
    queryKey: ['/api/chats'],
  });

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);

  const handleNewChat = () => {
    setSelectedChatId(null);
    setIsSidebarOpen(false);
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setIsSidebarOpen(false);
    setIsStreaming(false);
    setStreamingContent('');
  };

  const handleChatCreated = (chat: Chat) => {
    setSelectedChatId(chat.id);
    refetchChats();
  };

  return (
    <div className="flex h-screen bg-chat-bg">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div 
            className="w-80 h-full bg-white"
            onClick={e => e.stopPropagation()}
          >
            <ChatSidebar
              chats={chats}
              selectedChatId={selectedChatId}
              onNewChat={handleNewChat}
              onSelectChat={handleSelectChat}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex-col hidden lg:flex">
        <ChatSidebar
          chats={chats}
          selectedChatId={selectedChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
        />
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Chat Header */}
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setIsSidebarOpen(true)}
              >
                <i className="fas fa-bars text-gray-600"></i>
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-study-green rounded-full flex items-center justify-center">
                  <i className="fas fa-robot text-white text-sm"></i>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedChat?.title || "StudyBuddy AI"}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-500">Online & Ready to Help</span>
                  </div>
                </div>
              </div>
            </div>
            
            {selectedChat && (
              <div className="flex items-center space-x-2">
                <button 
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" 
                  title="Clear Chat"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this chat?")) {
                      // TODO: Implement delete chat
                    }
                  }}
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            )}
          </div>
        </header>

        <ChatMessages 
          chatId={selectedChatId} 
          onChatCreated={handleChatCreated}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
        />
        
        <MessageInput 
          chatId={selectedChatId}
          currentUser={currentUser}
          onChatCreated={handleChatCreated}
          onStreamingUpdate={(content, streaming) => {
            setStreamingContent(content);
            setIsStreaming(streaming);
          }}
        />
      </main>
    </div>
  );
}
