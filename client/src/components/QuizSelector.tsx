import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Calculator, FlaskConical, History, Heart, Brain } from "lucide-react";
import type { User } from "@shared/schema";

interface QuizSelectorProps {
  currentUser: User;
  onQuizSelect: (topic: string, question: string) => void;
}

const quizTopics = [
  {
    id: "math",
    name: "Math",
    icon: Calculator,
    color: "bg-blue-500",
    description: "Practice arithmetic, geometry, and problem solving"
  },
  {
    id: "science",
    name: "Science",
    icon: FlaskConical,
    color: "bg-green-500",
    description: "Explore biology, chemistry, physics, and earth science"
  },
  {
    id: "language_arts",
    name: "Language Arts",
    icon: BookOpen,
    color: "bg-purple-500",
    description: "Reading comprehension, grammar, and writing skills"
  },
  {
    id: "history",
    name: "History",
    icon: History,
    color: "bg-orange-500",
    description: "Learn about past events, cultures, and civilizations"
  },
  {
    id: "health",
    name: "Health",
    icon: Heart,
    color: "bg-red-500",
    description: "Nutrition, safety, and healthy living habits"
  }
];

export default function QuizSelector({ currentUser, onQuizSelect }: QuizSelectorProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const generateQuizQuestion = async (topicId: string, topicName: string) => {
    setIsLoading(topicId);
    
    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topicName,
          grade: currentUser.grade,
          age: currentUser.age,
          name: currentUser.name
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate quiz question');
      }

      const data = await response.json();
      onQuizSelect(topicName, data.question);
    } catch (error) {
      console.error('Error generating quiz question:', error);
      // Fallback to a simple prompt
      onQuizSelect(
        topicName,
        `I'd like a ${topicName.toLowerCase()} quiz question that's appropriate for a grade ${currentUser.grade} student. Please make it engaging and educational!`
      );
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-study-green/10 border-study-green/30 hover:bg-study-green/20 text-study-green font-medium"
        >
          <Brain className="w-4 h-4 mr-2" />
          Pop Quiz
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-study-green" />
            <span>Choose Your Quiz Topic</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {quizTopics.map((topic) => {
            const Icon = topic.icon;
            const isGenerating = isLoading === topic.id;
            
            return (
              <Card 
                key={topic.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-gray-300"
                onClick={() => !isGenerating && generateQuizQuestion(topic.id, topic.name)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-3 text-lg">
                    <div className={`p-2 rounded-lg ${topic.color} text-white`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span>{topic.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-600 text-sm mb-3">{topic.description}</p>
                  <Button 
                    className="w-full" 
                    variant={isGenerating ? "secondary" : "default"}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating...</span>
                      </div>
                    ) : (
                      `Start ${topic.name} Quiz`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Personalized for You</h4>
              <p className="text-blue-700 text-sm">
                Quiz questions are tailored for grade {currentUser.grade} students and will help reinforce your learning!
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}