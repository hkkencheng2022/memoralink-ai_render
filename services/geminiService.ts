import { GoogleGenAI, Type, Schema } from "@google/genai";
import { VocabularyItem, AiProvider, ChatMessage } from "../types";

// --- Configuration & Helpers ---

const GEMINI_MODEL = "gemini-3-flash-preview";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

export interface ChatSession {
  sendMessage: (message: string) => Promise<string>;
}

/**
 * Retrieves the API Key for Gemini.
 * Checks build-time env vars first, then runtime window injection (Streamlit).
 */
const getGeminiClient = () => {
  // @ts-ignore
  const key = process.env.API_KEY || (typeof window !== 'undefined' ? window.API_KEY : '');
  if (!key) {
    console.warn("Gemini API Key is missing.");
    return new GoogleGenAI({ apiKey: 'MISSING_KEY' }); 
  }
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Retrieves the API Key for DeepSeek.
 */
const getDeepSeekApiKey = () => {
  // @ts-ignore
  const key = process.env.DEEPSEEK_API_KEY || (typeof window !== 'undefined' ? window.DEEPSEEK_API_KEY : '');
  if (!key) console.warn("DeepSeek API Key is missing. Check .env or Streamlit Secrets.");
  return key;
};

const callDeepSeek = async (messages: any[], jsonMode: boolean = false) => {
  const apiKey = getDeepSeekApiKey();
  
  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: messages,
      response_format: jsonMode ? { type: "json_object" } : undefined,
      stream: false
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API Error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

const cleanJsonString = (str: string) => {
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

// --- Service Functions ---

/**
 * Generates vocabulary words based on a topic.
 */
export const generateVocabulary = async (
  topic: string, 
  count: number = 3, 
  difficulty: string = "Intermediate",
  provider: AiProvider = 'deepseek'
): Promise<VocabularyItem[]> => {
  
  const systemPrompt = "You are an expert English teacher specializing in memory techniques and mnemonics.";
  const userPrompt = `Generate ${count} ${difficulty} level English vocabulary words related to the topic: "${topic}". 
      Focus on words that are useful for oral exams or professional writing appropriate for a ${difficulty} learner.
      CRITICAL: Provide a creative 'mnemonic' (memory aid) for each to help a learner with poor memory.
      
      RETURN JSON ONLY. The JSON must be an array of objects with these keys:
      word, phonetic (IPA), definition, chineseTranslation, exampleSentence, mnemonic, context ('Work', 'Daily Life', or 'General').`;

  if (provider === 'gemini') {
    const schema: Schema = {
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
          context: { type: Type.STRING, enum: ["Work", "Daily Life", "General"] }
        },
        required: ["word", "definition", "chineseTranslation", "exampleSentence", "mnemonic"]
      }
    };

    try {
      const geminiAi = getGeminiClient();
      const response = await geminiAi.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          systemInstruction: systemPrompt
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as VocabularyItem[];
      }
      return [];
    } catch (error) {
      console.error("Gemini Error:", error);
      throw error;
    }
  } else {
    try {
      const content = await callDeepSeek([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], true);
      
      return JSON.parse(cleanJsonString(content)) as VocabularyItem[];
    } catch (error) {
      console.error("DeepSeek Error:", error);
      throw error;
    }
  }
};

/**
 * Generates details (mnemonics, definitions) for a specific list of words provided by the user.
 */
export const generateVocabularyFromList = async (
  words: string[], 
  provider: AiProvider = 'deepseek'
): Promise<VocabularyItem[]> => {
  
  const systemPrompt = "You are an expert English teacher. The user has a list of words they want to learn. Your job is to create memory aids for them.";
  const wordsString = words.join(", ");
  const userPrompt = `I have this list of English words: [${wordsString}].
      
      For EACH word, generate the full vocabulary card details including a creative mnemonic.
      
      RETURN JSON ONLY. The JSON must be an array of objects with these keys:
      word, phonetic (IPA), definition, chineseTranslation, exampleSentence, mnemonic, context ('Work', 'Daily Life', or 'General').`;

  if (provider === 'gemini') {
    const schema: Schema = {
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
          context: { type: Type.STRING, enum: ["Work", "Daily Life", "General"] }
        },
        required: ["word", "definition", "chineseTranslation", "exampleSentence", "mnemonic"]
      }
    };

    try {
      const geminiAi = getGeminiClient();
      const response = await geminiAi.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          systemInstruction: systemPrompt
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as VocabularyItem[];
      }
      return [];
    } catch (error) {
      console.error("Gemini Error:", error);
      throw error;
    }
  } else {
    try {
      const content = await callDeepSeek([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], true);
      
      return JSON.parse(cleanJsonString(content)) as VocabularyItem[];
    } catch (error) {
      console.error("DeepSeek Error:", error);
      throw error;
    }
  }
};

/**
 * Analyzes a text for improvements and vocabulary.
 */
export const analyzeWriting = async (
  text: string, 
  context: string,
  provider: AiProvider = 'deepseek'
): Promise<{ 
    correction: string, 
    explanation: string, 
    improvedVersion: string,
    keyVocabulary: VocabularyItem[]
  }> => {
  
  const systemPrompt = "You are a professional editor. Improve the user's writing and teach them better vocabulary.";
  const userPrompt = `Analyze this text intended for a "${context}":
  "${text}"

  1. Correct grammar mistakes.
  2. Provide a 'native speaker' improved version that sounds more professional or natural.
  3. Explain the main changes.
  4. Extract or suggest 2-3 advanced vocabulary words that fit this context, with mnemonics.

  RETURN JSON ONLY with keys: correction, explanation, improvedVersion, keyVocabulary (array of objects with word, definition, mnemonic, phonetic).`;

  if (provider === 'gemini') {
    const schema: Schema = {
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
      }
    };

    try {
      const geminiAi = getGeminiClient();
      const response = await geminiAi.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          systemInstruction: systemPrompt
        }
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
      throw new Error("Empty response from Gemini");
    } catch (error) {
      console.error("Gemini Error:", error);
      throw error;
    }
  } else {
    try {
      const content = await callDeepSeek([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], true);
      
      return JSON.parse(cleanJsonString(content));
    } catch (error) {
      console.error("DeepSeek Error:", error);
      throw error;
    }
  }
};

/**
 * Creates a chat session for the Oral Coach.
 */
export const createChatSession = (provider: AiProvider, systemPrompt: string): ChatSession => {
  if (provider === 'gemini') {
    const geminiAi = getGeminiClient();
    const chat = geminiAi.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7
      }
    });

    return {
      sendMessage: async (msg: string) => {
        const response = await chat.sendMessage(msg);
        return response.text || "";
      }
    };
  } else {
    // Basic context management for DeepSeek (stateless REST API)
    // In a real app, you'd want to persist 'history' in the React component and pass it here.
    // For this simplified version, we'll keep a local history closure.
    const history: any[] = [{ role: "system", content: systemPrompt }];

    return {
      sendMessage: async (msg: string) => {
        history.push({ role: "user", content: msg });
        const responseText = await callDeepSeek(history, false);
        history.push({ role: "assistant", content: responseText });
        return responseText;
      }
    };
  }
};
