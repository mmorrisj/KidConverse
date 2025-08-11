import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, UserPlus } from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface UserSelectorProps {
  onUserSelect: (user: UserType) => void;
  onNewUser: () => void;
}

export function UserSelector({ onUserSelect, onNewUser }: UserSelectorProps) {
  const { data: users, isLoading } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-chat-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-study-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chat-bg p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-study-blue mb-2">
            Welcome to StudyBuddy AI! 🤖
          </h1>
          <p className="text-gray-600 text-lg">
            Select your profile or create a new one to continue learning
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {users && users.length > 0 ? (
            users.map((user) => (
              <Card
                key={user.id}
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-study-blue"
                onClick={() => onUserSelect(user)}
              >
                <CardHeader className="text-center pb-4">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarFallback className="bg-study-blue text-white text-xl">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-xl text-gray-800">
                    {user.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-1 text-gray-600">
                    <p className="text-sm">
                      <strong>Age:</strong> {user.age}
                    </p>
                    <p className="text-sm">
                      <strong>Grade:</strong> {user.grade}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                  <Button 
                    className="w-full mt-4 bg-study-blue hover:bg-study-blue/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUserSelect(user);
                    }}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Continue Learning
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-12">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No students registered yet</p>
              <p className="text-sm">Create your first profile to get started!</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <Card className="inline-block cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-gray-300 hover:border-study-blue">
            <CardContent className="p-8" onClick={onNewUser}>
              <UserPlus className="w-12 h-12 mx-auto mb-4 text-study-blue" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Add New Student
              </h3>
              <p className="text-gray-600 mb-4">
                Register a new student profile
              </p>
              <Button 
                className="bg-study-blue hover:bg-study-blue/90"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewUser();
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Register Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}