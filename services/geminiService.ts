
import { GoogleGenAI, Type } from "@google/genai";
import { VocabularyItem, AiProvider } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

// Helper to get the correct API key from process.env
const getApiKey = (provider: AiProvider) => {
  if (provider === 'deepseek') {
    return process.env.DEEPSEEK_API_KEY || process.env.API_KEY;
  }
  return process.env.API_KEY;
};

// Robust JSON extraction helper
const extractJson = (text: string) => {
  try {
    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Error:", e, "Original text:", text);
    throw new Error("Failed to parse AI response as JSON");
  }
};

export const generateVocabulary = async (
  topic: string, 
  count: number = 3, 
  difficulty: string = 'Intermediate'
): Promise<VocabularyItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Topic: ${topic}. Difficulty: ${difficulty}. 
    The user has very poor memory. Provide ${count} words with unique, vivid, and funny stories (mnemonics) to help them remember.
    Include Chinese translations and phonetics. Return ONLY valid JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            definition: { type: Type.STRING },
            chineseTranslation: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
            mnemonic: { type: Type.STRING },
            context: { type: Type.STRING }
          },
          required: ["word", "definition", "chineseTranslation", "mnemonic", "exampleSentence"]
        }
      }
    }
  });
  
  return extractJson(response.text || "[]");
};

export const generateVocabularyFromList = async (
  words: string[],
  provider: AiProvider
): Promise<VocabularyItem[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(provider) });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Create memory aid cards for: ${words.join(', ')}. Focus on absurd mnemonics for poor memory. Return ONLY valid JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            definition: { type: Type.STRING },
            chineseTranslation: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
            mnemonic: { type: Type.STRING },
            context: { type: Type.STRING }
          },
          required: ["word", "definition", "chineseTranslation", "mnemonic", "exampleSentence"]
        }
      }
    }
  });
  
  return extractJson(response.text || "[]");
};

export const analyzeWriting = async (
  text: string, 
  context: string,
  provider: AiProvider
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(provider) });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Context: ${context}. Text to analyze: "${text}". 
    Task: 1. Correct grammar. 2. Suggest a native version. 3. Provide 2-3 key vocabulary words used or related with mnemonics.
    IMPORTANT: Return the response strictly as a JSON object.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          correction: { type: Type.STRING },
          explanation: { type: Type.STRING },
          improvedVersion: { type: Type.STRING },
          keyVocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                definition: { type: Type.STRING },
                mnemonic: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                chineseTranslation: { type: Type.STRING },
                exampleSentence: { type: Type.STRING }
              }
            }
          }
        },
        required: ["correction", "explanation", "improvedVersion"]
      }
    }
  });
  return extractJson(response.text || "{}");
};

export interface ChatSession {
  sendMessage: (msg: string) => Promise<string>;
}

export const createChatSession = (provider: AiProvider, systemInstruction: string): ChatSession => {
  const ai = new GoogleGenAI({ apiKey: getApiKey(provider) });
  const chat = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction,
    }
  });

  return {
    sendMessage: async (msg: string) => {
      const result = await chat.sendMessage({ message: msg });
      return result.text || "";
    }
  };
};
