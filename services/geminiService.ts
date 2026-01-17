import { GoogleGenAI, Type, Schema } from "@google/genai";
import { VocabularyItem, AiProvider } from "../types";

// Initialize Gemini Client
// Ensure we don't crash if env var is missing during dev boot
const apiKey = process.env.API_KEY || 'MISSING_KEY'; 
const geminiAi = new GoogleGenAI({ apiKey: apiKey });
const GEMINI_MODEL = "gemini-3-flash-preview";

// DeepSeek Configuration
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

// --- Helpers for DeepSeek ---

const getDeepSeekApiKey = () => {
  // Priority: 
  // 1. Build-time environment variable (Vite)
  // 2. Runtime injection via window object (Streamlit/Python wrapper)
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
  // Remove Markdown code blocks if present
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
    // DeepSeek
    try {
      const content = await callDeepSeek([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], true); // Enforce JSON mode
      
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
    // DeepSeek
    try {
      const content = await callDeepSeek([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], true); // Enforce JSON mode
      
      return JSON.parse(cleanJsonString(content)) as VocabularyItem[];
    } catch (error) {
      console.error("DeepSeek Error:", error);
      throw error;
    }
  }
};

/**
 * Analyzes writing for grammar, tone, and vocabulary usage.
 * Now also returns key vocabulary used in the improvement.
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
  
  const prompt = `Analyze the following English text intended for a ${context} context. 
      User Text: "${text}"
      
      1. Identify grammar errors and suggest improvements.
      2. Provide a 'correction' and a sophisticated 'improvedVersion'.
      3. Extract 3 high-quality vocabulary words used in your 'improvedVersion' that would be valuable for the user to learn.
      
      Return JSON with keys: 
      - 'correction' (string)
      - 'explanation' (string)
      - 'improvedVersion' (string)
      - 'keyVocabulary' (array of objects matching VocabularyItem structure: word, phonetic, definition, chineseTranslation, exampleSentence, mnemonic, context).
      
      IMPORTANT: Generate a unique 'mnemonic' for each vocabulary word to help retention.`;

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
              phonetic: { type: Type.STRING },
              definition: { type: Type.STRING },
              chineseTranslation: { type: Type.STRING },
              exampleSentence: { type: Type.STRING },
              mnemonic: { type: Type.STRING },
              context: { type: Type.STRING, enum: ["Work", "Daily Life", "General"] }
            },
            required: ["word", "definition", "chineseTranslation", "exampleSentence", "mnemonic"]
          }
        }
      }
    };

    const response = await geminiAi.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    if (response.text) return JSON.parse(response.text);
    throw new Error("No response");
  } else {
    // DeepSeek
    const content = await callDeepSeek([
      { role: "user", content: prompt }
    ], true);
    return JSON.parse(cleanJsonString(content));
  }
};

/**
 * Chat Session Interface to abstract different providers
 */
export interface ChatSession {
  sendMessage: (text: string) => Promise<string>;
}

/**
 * Creates a chat session based on provider.
 */
export const createChatSession = (
  provider: AiProvider, 
  systemInstruction: string
): ChatSession => {
  if (provider === 'gemini') {
    const chat = geminiAi.chats.create({
      model: GEMINI_MODEL,
      config: { systemInstruction }
    });
    
    return {
      sendMessage: async (text: string) => {
        const result = await chat.sendMessage({ message: text });
        return result.text || "";
      }
    };
  } else {
    // DeepSeek implementation of ChatSession (Managing history locally)
    let history: { role: string, content: string }[] = [
      { role: "system", content: systemInstruction }
    ];

    return {
      sendMessage: async (text: string) => {
        history.push({ role: "user", content: text });
        
        const responseContent = await callDeepSeek(history, false);
        
        history.push({ role: "assistant", content: responseContent });
        return responseContent;
      }
    };
  }
};