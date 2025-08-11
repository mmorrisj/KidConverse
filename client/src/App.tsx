import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ChatPage from "@/pages/chat";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";
import type { User } from "@shared/schema";

function Router() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on app start
    const storedUserId = localStorage.getItem('studybuddy-user-id');
    if (storedUserId) {
      // Fetch user details to verify they still exist
      fetch(`/api/users/${storedUserId}`)
        .then(res => res.ok ? res.json() : null)
        .then(user => {
          if (user) {
            setCurrentUser(user);
          } else {
            localStorage.removeItem('studybuddy-user-id');
          }
        })
        .catch(() => {
          localStorage.removeItem('studybuddy-user-id');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleUserRegistered = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('studybuddy-user-id', user.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-chat-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-study-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading StudyBuddy...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {currentUser ? (
          <ChatPage currentUser={currentUser} />
        ) : (
          <Register onSuccess={handleUserRegistered} />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
