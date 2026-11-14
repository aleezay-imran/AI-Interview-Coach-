// Shared types across the app

export type FeedbackLanguage = "english" | "roman-urdu" | "urdu";
export type InterviewType = "hr" | "technical" | "behavioral" | "mixed";
export type DifficultyLevel = "fresher" | "intermediate";

export interface Question {
  id: number;
  question: string;
}

export interface AnswerFeedback {
  questionId: number;
  question: string;
  answer: string;
  score: number; // out of 10
  feedback: {
    clarity: string;
    structure: string;
    relevance: string;
  };
  improvedAnswer: string;
}

export interface SummaryReport {
  overallScore: number;
  strengths: string[];
  weakAreas: string[];
  answers: AnswerFeedback[];
}

export interface GenerateQuestionsRequest {
  cvText: string;
  jobRole: string;
  interviewType: InterviewType;
  difficulty: DifficultyLevel;
}

export interface GenerateQuestionsResponse {
  questions: Question[];
}

export interface EvaluateAnswerRequest {
  question: string;
  answer: string;
  jobRole: string;
  difficulty: DifficultyLevel;
  feedbackLanguage: FeedbackLanguage;
}

export interface EvaluateAnswerResponse {
  score: number;
  feedback: {
    clarity: string;
    structure: string;
    relevance: string;
  };
  improvedAnswer: string;
}

export interface GenerateSummaryRequest {
  answers: Omit<AnswerFeedback, "improvedAnswer">[];
  jobRole: string;
  feedbackLanguage: FeedbackLanguage;
}

export interface GenerateSummaryResponse {
  overallScore: number;
  strengths: string[];
  weakAreas: string[];
}
