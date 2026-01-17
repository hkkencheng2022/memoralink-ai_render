
import { GoogleGenAI, Type } from "@google/genai";
import { VocabularyItem, AiProvider } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

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
    Include Chinese translations and phonetics.`,
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
  
  return JSON.parse(response.text || "[]");
};

export const generateVocabularyFromList = async (
  words: string[],
  _provider: AiProvider
): Promise<VocabularyItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Create memory aid cards for: ${words.join(', ')}. Focus on absurd mnemonics for poor memory.`,
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
  
  return JSON.parse(response.text || "[]");
};

export const analyzeWriting = async (
  text: string, 
  context: string,
  _provider: AiProvider
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Context: ${context}. Text: "${text}". 
    Correct grammar, suggest a more native version, and provide vocabulary with mnemonics.`,
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
                phonetic: { type: Type.STRING }
              }
            }
          }
        },
        required: ["correction", "explanation", "improvedVersion"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export interface ChatSession {
  sendMessage: (msg: string) => Promise<string>;
}

export const createChatSession = (_provider: AiProvider, systemInstruction: string): ChatSession => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction,
    }
  });

  return {
    sendMessage: async (msg: string) => {
      // FIX: Parameters must be passed as an object with 'message' property
      const result = await chat.sendMessage({ message: msg });
      return result.text || "";
    }
  };
};
