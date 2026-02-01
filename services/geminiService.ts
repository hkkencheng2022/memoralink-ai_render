
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
    Role: You are a Master Memory Coach who connects Pop Culture with Real-World News.
    Task: Provide ${count} vocabulary words.
    
    For the "mnemonic" field of each word, act as a Creative Selector to create a vivid mental image.
    Step 1: Choose the SINGLE BEST category for the word:
    - Category A (Anime/Movies): Characters from Ghibli, One Piece, Marvel, etc.
    - Category B (Stars/Icons): Singers, Historical Figures, or Celebrities.
    - Category C (Anthropomorphic Animals): Animals acting like humans (e.g., a Wolf in a suit).
    - Category D (AI Surrealism): A strange, dream-like combination of elements.
    
    Step 2: Write the "mnemonic" as a vivid, descriptive image generation prompt in English.
    
    Include translations (in the 'chineseTranslation' field), phonetics, and a 'tags' array (e.g., ["Emotion", "Verb", "Business"]) for each word. Return ONLY valid JSON.`;
  
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
            chineseTranslation: { type: Type.STRING, description: "Translation/Definition of the word" },
            exampleSentence: { type: Type.STRING },
            mnemonic: { type: Type.STRING, description: "Vivid image description in English" },
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
  const sys = `You are a Master Memory Coach who connects Pop Culture with Real-World News.
  For the "mnemonic" field of each word:
  1. The Creative Selector (The Hook): Choose ONE category for a vivid image:
     - Anime/Movies (Ghibli, Marvel, One Piece)
     - Stars/Icons (Singers, Historical Figures)
     - Anthropomorphic Animals (Animals in suits, etc.)
     - AI Surrealism (Strange, dream-like)
  2. Write the mnemonic as a descriptive image generation prompt in English that visualizes this scene.

  IMPORTANT: You must return a valid JSON array of objects. 
  Each object MUST contain strictly these keys: "word", "phonetic", "definition", "chineseTranslation", "exampleSentence", "mnemonic", "context", "tags".`;
  
  const prompt = `Create cards for: ${words.join(', ')}. Ensure the "exampleSentence" key is present. Mnemonics must be in English.`;

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
            chineseTranslation: { type: Type.STRING, description: "Translation/Definition of the word" },
            exampleSentence: { type: Type.STRING },
            mnemonic: { type: Type.STRING, description: "Vivid image description in English" },
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
  const sys = `Topic: ${topic}. Difficulty: ${difficulty}. 
  Role: You are a Master Memory Coach who connects Pop Culture with Real-World News.
  Task: Provide ${count} words. 
  
  For the "mnemonic" field:
  Step 1: The Creative Selector. Choose the SINGLE BEST category to create a vivid mental image:
  - Category A (Anime/Movies): Characters from Ghibli, One Piece, Marvel, etc.
  - Category B (Stars/Icons): Singers, Historical Figures, or Celebrities.
  - Category C (Anthropomorphic Animals): Animals acting like humans.
  - Category D (AI Surrealism): A strange, dream-like combination of elements.
  Step 2: Write the mnemonic as a vivid, descriptive image generation prompt in English that visualizes this scene.

  Output Format: Return ONLY a raw JSON array of objects.
  Required Keys for each object:
  - "word": The vocabulary word.
  - "phonetic": IPA pronunciation.
  - "definition": English definition.
  - "chineseTranslation": Translation/Definition of the word.
  - "exampleSentence": A clear sentence using the word in context.
  - "mnemonic": The vivid visual story from Step 2 (in English).
  - "context": Brief usage context (e.g., Formal, Slang).
  - "tags": Array of related keywords.`;

  const prompt = `Generate ${count} vocabulary cards for topic '${topic}'. Ensure exact JSON keys including "exampleSentence". Mnemonics must be in English.`;

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
  const sys = `You are an expert English writing coach and Master Memory Coach.
  Task: 
  1. Correct grammar (Return in English).
  2. Suggest a native English speaker version (Return in English).
  3. Provide a detailed explanation of errors and improvements in English.
  4. Suggest 2-3 key vocabulary words with mnemonics.

  For the vocabulary mnemonics, use the "Master Memory Coach" strategy:
  - Connect the word to Pop Culture (Anime/Movies), Stars/Icons, Anthropomorphic Animals, or AI Surrealism.
  - Write the mnemonic as a vivid visual description in English.

  IMPORTANT: Return the response strictly as a valid JSON object.
  JSON Schema Structure:
  {
    "correction": "The corrected text in English",
    "improvedVersion": "The native-sounding version in English",
    "explanation": "Detailed explanation in English",
    "keyVocabulary": [
      {
        "word": "English word",
        "definition": "English definition",
        "mnemonic": "Visual scene description in English",
        "phonetic": "IPA",
        "chineseTranslation": "Translation/Definition",
        "exampleSentence": "English example sentence",
        "tags": ["Tag1", "Tag2"]
      }
    ]
  }`;
  
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
          correction: { type: Type.STRING, description: "Corrected text in English" },
          explanation: { type: Type.STRING, description: "Explanation in English" },
          improvedVersion: { type: Type.STRING, description: "Native speaker version in English" },
          keyVocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                definition: { type: Type.STRING },
                mnemonic: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                chineseTranslation: { type: Type.STRING, description: "Translation/Definition" },
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
  // Removed strict Traditional Chinese instruction
  const enhancedSystemInstruction = systemInstruction;

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
