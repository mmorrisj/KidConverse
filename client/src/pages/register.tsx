import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { insertUserSchema, type InsertUser } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface RegisterProps {
  onSuccess: (user: any) => void;
  onBack?: () => void;
}

export default function Register({ onSuccess, onBack }: RegisterProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: '',
      email: '',
      age: 8,
      grade: '2',
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await apiRequest('POST', '/api/users/register', userData);
      return await response.json();
    },
    onSuccess: (user) => {
      toast({
        title: "Welcome to StudyBuddy!",
        description: `Hi ${user.name}! Let's start learning together.`,
      });
      onSuccess(user);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again with different information.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertUser) => {
    setIsLoading(true);
    try {
      await registerMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const gradeOptions = [
    { value: 'K', label: 'Kindergarten' },
    { value: '1', label: '1st Grade' },
    { value: '2', label: '2nd Grade' },
    { value: '3', label: '3rd Grade' },
    { value: '4', label: '4th Grade' },
    { value: '5', label: '5th Grade' },
    { value: '6', label: '6th Grade' },
    { value: '7', label: '7th Grade' },
  ];

  return (
    <div className="min-h-screen bg-chat-bg flex items-center justify-center p-4 relative">
      {onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="absolute top-4 left-4 text-gray-600 hover:text-study-blue"
        >
          ← Back to Users
        </Button>
      )}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-study-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-user-plus text-study-blue text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join StudyBuddy AI</h1>
          <p className="text-gray-600">Let's get to know you so I can help you learn better!</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="What should I call you?" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is how I'll greet you in our chats!
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your.email@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    I'll email you a summary of our chats each day.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Age</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="5" 
                      max="12" 
                      placeholder="8"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    This helps me explain things in the right way for you.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Grade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your grade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {gradeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    I'll match my explanations to your grade level.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-study-blue hover:bg-blue-600 text-white py-3 rounded-xl text-lg font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating your account...</span>
                </div>
              ) : (
                "Start Learning with StudyBuddy!"
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
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
    </div>
  );
}