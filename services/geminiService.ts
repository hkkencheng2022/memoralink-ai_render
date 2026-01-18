
import { GoogleGenAI, Type } from "@google/genai";
import { VocabularyItem, AiProvider } from "../types";

const GEMINI_MODEL = 'gemini-3-flash-preview';
const DEEPSEEK_MODEL = 'deepseek-chat'; // Standard DeepSeek model name

// Declare global window properties for runtime injection
declare global {
  interface Window {
    API_KEY?: string;
    DEEPSEEK_API_KEY?: string;
  }
}

// Helper to get the correct API key from Window (Runtime) or Env (Build)
const getApiKey = (provider: AiProvider) => {
  if (provider === 'deepseek') {
    const key = window.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new Error("DeepSeek API Key is missing. Please check your settings.");
    }
    return key;
  }
  // Default to Gemini
  const key = window.API_KEY || process.env.API_KEY;
  // GoogleGenAI SDK will throw its own error if key is missing, but cleaner to check here
  return key;
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
  // Updated URL to the standard chat completions endpoint
  const response = await fetch('https://api.deepseek.com/chat/completions', {
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
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `DeepSeek API error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export const generateVocabulary = async (
  topic: string, 
  count: number = 3, 
  difficulty: string = 'Intermediate'
): Promise<VocabularyItem[]> => {
  const prompt = `Topic: ${topic}. Difficulty: ${difficulty}. 
    The user has very poor memory. Provide ${count} words with unique, vivid, and funny stories (mnemonics) to help them remember.
    Include Traditional Chinese translations (繁體中文), phonetics, and a 'tags' array (e.g., ["Emotion", "Verb", "Business"]) for each word. Return ONLY valid JSON.`;
  
  // Note: generateVocabulary currently hardcodes Gemini usage. 
  // To use DeepSeek here too, we would need to pass the provider or default to one.
  // For safety/schema support, keeping Gemini as default for this function unless called via generateVocabularyFromList/Topic logic.
  
  const ai = new GoogleGenAI({ apiKey: getApiKey('gemini') });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
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
            chineseTranslation: { type: Type.STRING, description: "Traditional Chinese translation (繁體中文)" },
            exampleSentence: { type: Type.STRING },
            mnemonic: { type: Type.STRING },
            context: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["word", "definition", "chineseTranslation", "mnemonic", "exampleSentence", "tags"]
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
  const sys = `You are a vocabulary expert. Create memory aid cards for the provided words.
  IMPORTANT: You must return a valid JSON array of objects. 
  Each object MUST contain strictly these keys: "word", "phonetic", "definition", "chineseTranslation" (Must be Traditional Chinese 繁體中文), "exampleSentence", "mnemonic", "context", "tags".`;
  
  const prompt = `Create cards for: ${words.join(', ')}. Ensure the "exampleSentence" key is present for every word. Translate to Traditional Chinese (繁體中文).`;

  if (provider === 'deepseek') {
    const resText = await callDeepSeek(prompt, sys);
    return extractJson(resText);
  }

  const ai = new GoogleGenAI({ apiKey: getApiKey(provider) });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: sys,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            definition: { type: Type.STRING },
            chineseTranslation: { type: Type.STRING, description: "Traditional Chinese translation (繁體中文)" },
            exampleSentence: { type: Type.STRING },
            mnemonic: { type: Type.STRING },
            context: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["word", "definition", "chineseTranslation", "mnemonic", "exampleSentence", "tags"]
        }
      }
    }
  });
  
  return extractJson(response.text || "[]");
};

export const generateVocabularyByTopic = async (
  topic: string, 
  count: number, 
  difficulty: string,
  provider: AiProvider
): Promise<VocabularyItem[]> => {
  const sys = `Topic: ${topic}. Difficulty: ${difficulty}. You are a helpful vocabulary teacher.
  Task: Provide ${count} words. 
  Output Format: Return ONLY a raw JSON array of objects.
  Required Keys for each object:
  - "word": The vocabulary word.
  - "phonetic": IPA pronunciation.
  - "definition": English definition.
  - "chineseTranslation": Traditional Chinese translation (繁體中文).
  - "exampleSentence": A clear sentence using the word in context.
  - "mnemonic": A vivid, funny, or weird story to help remember the word.
  - "context": Brief usage context (e.g., Formal, Slang).
  - "tags": Array of related keywords (e.g., ["Business", "Verb"]).`;

  const prompt = `Generate ${count} vocabulary cards for topic '${topic}'. Ensure exact JSON keys including "exampleSentence". All Chinese must be Traditional (繁體中文).`;

  if (provider === 'deepseek') {
    const resText = await callDeepSeek(prompt, sys);
    return extractJson(resText);
  }

  // Fallback to Gemini
  return generateVocabulary(topic, count, difficulty);
};

export const analyzeWriting = async (
  text: string, 
  context: string,
  provider: AiProvider
): Promise<any> => {
  const sys = `Task: 1. Correct grammar. 2. Suggest a native version. 3. Provide 2-3 key vocabulary words with mnemonics.
    IMPORTANT: Return the response strictly as a JSON object with keys: correction, explanation, improvedVersion, keyVocabulary (array of objects with word, definition, mnemonic, phonetic, chineseTranslation, exampleSentence, tags).
    All explanations and translations must be in Traditional Chinese (繁體中文) where applicable.`;
  const prompt = `Context: ${context}. Text to analyze: "${text}". Output in Traditional Chinese (繁體中文).`;

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
                chineseTranslation: { type: Type.STRING, description: "Traditional Chinese translation (繁體中文)" },
                exampleSentence: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
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
  const enhancedSystemInstruction = systemInstruction + " Please ensure any Chinese text provided is in Traditional Chinese (繁體中文).";

  if (provider === 'deepseek') {
    let history: {role: string, content: string}[] = [];
    return {
      sendMessage: async (msg: string) => {
        const apiKey = getApiKey('deepseek');
        history.push({ role: "user", content: msg });
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages: [{ role: "system", content: enhancedSystemInstruction }, ...history]
          })
        });
        
        if (!response.ok) {
           const err = await response.json().catch(() => ({}));
           throw new Error(err.error?.message || `DeepSeek Error: ${response.status}`);
        }

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
      systemInstruction: enhancedSystemInstruction,
    }
  });

  return {
    sendMessage: async (msg: string) => {
      const result = await chat.sendMessage({ message: msg });
      return result.text || "";
    }
  };
};
