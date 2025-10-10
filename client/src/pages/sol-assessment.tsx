import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navigation } from "@/components/Navigation";
import type { User, SolStandard, AssessmentItem, AssessmentAttempt } from "@shared/schema";

interface SOLAssessmentProps {
  currentUser: User;
  onLogout?: () => void;
}

type ItemType = "MCQ" | "FIB" | "CR";

interface MCQChoice {
  id: string;
  text: string;
  is_correct: boolean;
}

interface MCQPayload {
  choices: MCQChoice[];
  rationale: Record<string, string>;
}

interface FIBPayload {
  answer_key: {
    expected: string;
    alt_equivalents?: string[];
    format?: string;
  };
  tolerance?: number;
  units?: string;
}

interface CRPayload {
  expected_ideas: string[];
  rubric: Array<{
    dimension: string;
    scale: string;
  }>;
}

export default function SOLAssessment({ currentUser, onLogout }: SOLAssessmentProps) {
  const { toast } = useToast();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedStandard, setSelectedStandard] = useState<string>("");
  const [selectedItemType, setSelectedItemType] = useState<ItemType>("MCQ");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("medium");
  const [numberOfQuestions, setNumberOfQuestions] = useState<number>(1);
  const [currentItem, setCurrentItem] = useState<AssessmentItem | null>(null);
  const [userResponse, setUserResponse] = useState<string>("");
  const [showResults, setShowResults] = useState(false);
  const [attemptResult, setAttemptResult] = useState<any>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [questionQueue, setQuestionQueue] = useState<AssessmentItem[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [completedAttempts, setCompletedAttempts] = useState<any[]>([]);

  // Fetch SOL standards for selected subject and grade
  const { data: standards = [] } = useQuery<SolStandard[]>({
    queryKey: ["/api/sol/standards", { subject: selectedSubject, grade: currentUser.grade }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subject', selectedSubject);
      if (currentUser.grade) params.append('grade', currentUser.grade);
      
      const response = await fetch(`/api/sol/standards?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch standards');
      }
      return response.json();
    },
    enabled: !!selectedSubject,
  });

  // Generate assessment item mutation
  const generateItemMutation = useMutation({
    mutationFn: async (params: {
      standardId: string;
      itemType: ItemType;
      difficulty: string;
    }) => {
      const response = await apiRequest("POST", "/api/sol/generate-item", {
        ...params,
        userId: currentUser.id,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate assessment item");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setQuestionQueue(prev => [...prev, data]);
      setCurrentItem(data);
      setStartTime(new Date());
      setUserResponse("");
      setShowResults(false);
      setAttemptResult(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate question",
        variant: "destructive",
      });
    },
  });

  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async (params: {
      itemId: string;
      userResponse: string;
      durationSeconds: number;
    }) => {
      const response = await apiRequest("POST", "/api/sol/submit-attempt", {
        userId: currentUser.id,
        itemId: params.itemId,
        response: params.userResponse,
        timeSpent: params.durationSeconds,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit response");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setAttemptResult(data);
      setShowResults(true);
      setCompletedAttempts(prev => [...prev, data]);
      queryClient.invalidateQueries({ queryKey: ["/api/sol/mastery", currentUser.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit answer",
        variant: "destructive",
      });
    },
  });

  const handleGenerateItem = () => {
    console.log("Generate button clicked", { 
      selectedStandard, 
      selectedSubject, 
      standardsLength: standards.length,
      selectedItemType,
      selectedDifficulty,
      numberOfQuestions
    });
    
    if (!selectedStandard) {
      toast({
        title: "Error",
        description: "Please select a standard first",
        variant: "destructive",
      });
      return;
    }

    // Reset state for new question set
    setQuestionQueue([]);
    setCurrentQuestionIndex(0);
    setCompletedAttempts([]);
    setCurrentItem(null);
    setUserResponse("");
    setShowResults(false);

    // Generate first question
    generateItemMutation.mutate({
      standardId: selectedStandard,
      itemType: selectedItemType,
      difficulty: selectedDifficulty,
    });
  };

  const handleSubmitResponse = () => {
    if (!currentItem || !userResponse.trim()) {
      toast({
        title: "Error",
        description: "Please provide an answer",
        variant: "destructive",
      });
      return;
    }

    const duration = startTime ? (Date.now() - startTime.getTime()) / 1000 : 0;
    
    submitResponseMutation.mutate({
      itemId: currentItem.id,
      userResponse: userResponse.trim(),
      durationSeconds: duration,
    });
  };

  const handleNewQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex < numberOfQuestions && nextIndex < questionQueue.length) {
      // Show next question from queue
      setCurrentQuestionIndex(nextIndex);
      setCurrentItem(questionQueue[nextIndex]);
      setUserResponse("");
      setShowResults(false);
      setAttemptResult(null);
      setStartTime(new Date());
    } else if (nextIndex < numberOfQuestions) {
      // Generate next question
      setCurrentQuestionIndex(nextIndex);
      generateItemMutation.mutate({
        standardId: selectedStandard,
        itemType: selectedItemType,
        difficulty: selectedDifficulty,
      });
      setUserResponse("");
      setShowResults(false);
      setAttemptResult(null);
    } else {
      // Completed all questions - show summary or reset
      if (completedAttempts.length > 1) {
        // Show summary view (implement later)
        setCurrentItem(null);
        setShowResults(false);
        setAttemptResult(null);
        setStartTime(null);
      } else {
        // Reset for new set
        setCurrentItem(null);
        setUserResponse("");
        setShowResults(false);
        setAttemptResult(null);
        setStartTime(null);
        setQuestionQueue([]);
        setCurrentQuestionIndex(0);
        setCompletedAttempts([]);
      }
    }
  };

  const renderQuestionContent = () => {
    if (!currentItem) return null;

    const payload = currentItem.payload as any;

    return (
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg">Assessment Question</CardTitle>
              {numberOfQuestions > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {currentQuestionIndex + 1} of {numberOfQuestions}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{currentItem.itemType}</Badge>
              <Badge variant="outline" className="text-xs">{currentItem.difficulty}</Badge>
              <Badge variant="outline" className="text-xs">DOK {currentItem.dok}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4">
            <p className="text-xs sm:text-sm text-gray-600 mb-2">Standard: {currentItem.solId}</p>
            <p className="text-sm sm:text-base leading-relaxed">{currentItem.stem}</p>
          </div>

          {!showResults && (
            <div className="space-y-4">
              {currentItem.itemType === "MCQ" && (
                <RadioGroup value={userResponse} onValueChange={setUserResponse}>
                  {payload.options?.map((option: string, index: number) => {
                    const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                    return (
                      <div key={optionLetter} className="flex items-center space-x-3 py-2">
                        <RadioGroupItem value={optionLetter} id={optionLetter} className="min-w-[20px]" />
                        <Label htmlFor={optionLetter} className="flex-1 cursor-pointer text-sm sm:text-base leading-relaxed">
                          {option}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}

              {currentItem.itemType === "FIB" && (
                <div>
                  <Label htmlFor="fib-answer">Your Answer:</Label>
                  <Input
                    id="fib-answer"
                    value={userResponse}
                    onChange={(e) => setUserResponse(e.target.value)}
                    placeholder="Enter your answer"
                    className="mt-1"
                  />
                  {(payload as FIBPayload).units && (
                    <p className="text-sm text-gray-500 mt-1">
                      Include units: {(payload as FIBPayload).units}
                    </p>
                  )}
                </div>
              )}

              {currentItem.itemType === "CR" && (
                <div>
                  <Label htmlFor="cr-response">Your Response:</Label>
                  <Textarea
                    id="cr-response"
                    value={userResponse}
                    onChange={(e) => setUserResponse(e.target.value)}
                    placeholder="Write your complete response here"
                    className="mt-1 min-h-[120px]"
                  />
                </div>
              )}

              <Button
                onClick={handleSubmitResponse}
                disabled={!userResponse.trim() || submitResponseMutation.isPending}
                className="w-full h-12 text-base"
              >
                {submitResponseMutation.isPending ? "Submitting..." : "Submit Answer"}
              </Button>
            </div>
          )}

          {showResults && attemptResult && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Results</h4>
                <Badge variant={attemptResult.is_correct ? "default" : "secondary"}>
                  {attemptResult.is_correct ? "Correct" : "Incorrect"}
                </Badge>
              </div>
              
              <div>
                <p><strong>Your Answer:</strong> {userResponse}</p>
                <p><strong>Score:</strong> {attemptResult.score}/{attemptResult.max_score}</p>
              </div>

              {attemptResult.feedback && (
                <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                  <p className="text-sm">{attemptResult.feedback}</p>
                </div>
              )}

              <div className="flex gap-2">
                {currentQuestionIndex + 1 < numberOfQuestions ? (
                  <Button onClick={handleNewQuestion} className="flex-1 h-12 text-base">
                    Next Question ({currentQuestionIndex + 2} of {numberOfQuestions})
                  </Button>
                ) : (
                  <Button onClick={handleNewQuestion} variant="outline" className="flex-1 h-12 text-base">
                    {completedAttempts.length > 1 ? "View Summary" : "Try Another Set"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-screen h-dvh">
      <Navigation currentUser={currentUser} onLogout={onLogout || (() => {})} />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-study-blue mb-2">SOL Assessment</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Practice with Virginia Standards of Learning aligned questions for {currentUser.name} (Grade {currentUser.grade})
          </p>
        </div>

        {!currentItem && (
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Generate Assessment Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="english">English Language Arts</SelectItem>
                      <SelectItem value="history">History & Social Science</SelectItem>
                      <SelectItem value="health">Health & Physical Education</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Question Type</Label>
                  <Select value={selectedItemType} onValueChange={(value) => setSelectedItemType(value as ItemType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MCQ">Multiple Choice</SelectItem>
                      <SelectItem value="FIB">Fill in the Blank</SelectItem>
                      <SelectItem value="CR">Constructed Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSubject && (
                <div>
                  <Label>Standard ({standards.length} available)</Label>
                  <Select value={selectedStandard} onValueChange={setSelectedStandard}>
                    <SelectTrigger>
                      <SelectValue placeholder={standards.length > 0 ? "Choose a standard" : "Loading standards..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {standards.length > 0 ? (
                        standards.map((standard) => (
                          <SelectItem key={standard.id} value={standard.id}>
                            {standard.id}: {standard.description.substring(0, 60)}...
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-standards" disabled>No standards available for Grade {currentUser.grade}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Difficulty</Label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Number of Questions</Label>
                  <Select value={numberOfQuestions.toString()} onValueChange={(value) => setNumberOfQuestions(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Question</SelectItem>
                      <SelectItem value="2">2 Questions</SelectItem>
                      <SelectItem value="3">3 Questions</SelectItem>
                      <SelectItem value="5">5 Questions</SelectItem>
                      <SelectItem value="10">10 Questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGenerateItem}
                disabled={!selectedStandard || generateItemMutation.isPending}
                className="w-full h-12 text-base"
              >
                {generateItemMutation.isPending ? "Generating Question..." : "Generate Question"}
              </Button>
            </CardContent>
          </Card>
        )}

        {renderQuestionContent()}

        {!currentItem && completedAttempts.length > 1 && (
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Assessment Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {completedAttempts.filter(a => a.is_correct).length}
                    </div>
                    <div className="text-sm text-blue-600">Correct</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {completedAttempts.length}
                    </div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round((completedAttempts.filter(a => a.is_correct).length / completedAttempts.length) * 100)}%
                    </div>
                    <div className="text-sm text-green-600">Score</div>
                  </div>
                </div>
                
                <Button
                  onClick={() => {
                    setQuestionQueue([]);
                    setCurrentQuestionIndex(0);
                    setCompletedAttempts([]);
                  }}
                  className="w-full h-12 text-base"
                >
                  Start New Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
        </div>
      </div>
    </div>
  );
}