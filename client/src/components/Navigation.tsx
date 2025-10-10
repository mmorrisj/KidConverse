import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { MessageCircle, ClipboardCheck, LogOut, User } from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface NavigationProps {
  currentUser: UserType;
  onLogout: () => void;
}

export function Navigation({ currentUser, onLogout }: NavigationProps) {
  const [location] = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-study-blue rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">SB</span>
            </div>
            <span className="font-bold text-base sm:text-xl text-study-blue hidden xs:inline">StudyBuddy AI</span>
          </div>

          <div className="flex items-center space-x-1">
            <Link href="/">
              <Button
                variant={location === "/" ? "default" : "ghost"}
                size="sm"
                className="flex items-center space-x-1 sm:space-x-2 h-9 px-2 sm:px-3"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </Button>
            </Link>

            <Link href="/sol-assessment">
              <Button
                variant={location === "/sol-assessment" ? "default" : "ghost"}
                size="sm"
                className="flex items-center space-x-1 sm:space-x-2 h-9 px-2 sm:px-3"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span className="hidden sm:inline">SOL</span>
                <span className="hidden md:inline">Assessment</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{currentUser.name} (Grade {currentUser.grade})</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="flex items-center space-x-1 sm:space-x-2 h-9 px-2 sm:px-3"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Switch</span>
            <span className="hidden md:inline">User</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}