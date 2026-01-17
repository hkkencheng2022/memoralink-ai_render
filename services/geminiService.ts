
import { GoogleGenAI, Type } from "@google/genai";
import { VocabularyItem, AiProvider } from "../types";

const GEMINI_MODEL = 'gemini-3-flash-preview';
const DEEPSEEK_MODEL = 'deepseek-chat'; // Standard DeepSeek model name

// Helper to get the correct API key
const getApiKey = (provider: AiProvider) => {
  if (provider === 'deepseek') {
    return process.env.DEEPSEEK_API_KEY || process.env.API_KEY;
  }
  return process.env.API_KEY;
};

// Robust JSON extraction helper
const extractJson = (text: string) => {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Error:", e, "Original text:", text);
    throw new Error("Failed to parse AI response as JSON. The model might have returned an invalid format.");
  }
};

/**
 * DeepSeek REST API Caller (OpenAI Compatible)
 */
async function callDeepSeek(prompt: string, systemInstruction: string) {
  const apiKey = getApiKey('deepseek');
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export const generateVocabulary = async (
  topic: string, 
  count: number = 3, 
  difficulty: string = 'Intermediate'
): Promise<VocabularyItem[]> => {
  // We use Gemini for vocabulary generation as it supports responseSchema strictly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
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
  if (provider === 'deepseek') {
    const sys = "You are a vocabulary expert. Create memory aid cards for provided words. Focus on absurd mnemonics. Return ONLY a JSON array.";
    const prompt = `Create cards for: ${words.join(', ')}. Format as JSON array of objects with keys: word, phonetic, definition, chineseTranslation, exampleSentence, mnemonic, context.`;
    const resText = await callDeepSeek(prompt, sys);
    return extractJson(resText);
  }

  const ai = new GoogleGenAI({ apiKey: getApiKey(provider) });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
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
  const sys = `Task: 1. Correct grammar. 2. Suggest a native version. 3. Provide 2-3 key vocabulary words with mnemonics.
    IMPORTANT: Return the response strictly as a JSON object with keys: correction, explanation, improvedVersion, keyVocabulary (array of objects with word, definition, mnemonic, phonetic, chineseTranslation, exampleSentence).`;
  const prompt = `Context: ${context}. Text to analyze: "${text}".`;

  if (provider === 'deepseek') {
    const resText = await callDeepSeek(prompt, sys);
    return extractJson(resText);
  }

  const ai = new GoogleGenAI({ apiKey: getApiKey('gemini') });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: sys,
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
  if (provider === 'deepseek') {
    let history: {role: string, content: string}[] = [];
    return {
      sendMessage: async (msg: string) => {
        const apiKey = getApiKey('deepseek');
        history.push({ role: "user", content: msg });
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages: [{ role: "system", content: systemInstruction }, ...history]
          })
        });
        const data = await response.json();
        const content = data.choices[0].message.content;
        history.push({ role: "assistant", content });
        return content;
      }
    };
  }

  const ai = new GoogleGenAI({ apiKey: getApiKey('gemini') });
  const chat = ai.chats.create({
    model: GEMINI_MODEL,
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
