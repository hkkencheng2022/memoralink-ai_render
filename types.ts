
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  VOCABULARY = 'VOCABULARY',
  WRITING = 'WRITING',
  SPEAKING = 'SPEAKING',
  LIBRARY = 'LIBRARY',
  QUIZ = 'QUIZ'
}

export type AiProvider = 'gemini' | 'deepseek';

export interface VocabularyItem {
  word: string;
  phonetic?: string;
  definition: string;
  chineseTranslation: string;
  exampleSentence: string;
  mnemonic: string; // Critical for memory retention
  context: string;
  tags?: string[]; // New: For categorization (e.g., Emotion, Verb)
}

export interface WritingEntry {
  id: string;
  originalText: string;
  correction: string;
  improvedVersion: string;
  explanation: string;
  context: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  feedback?: string; // Grammar/Style feedback on this specific message
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  initialPrompt: string;
}

export const TOPICS = [
  "Business Meetings",
  "Daily Commute",
  "Shopping & Groceries",
  "Job Interview",
  "Email Correspondence",
  "Travel & Tourism",
  "Health & Medical",
  "Technology"
];
