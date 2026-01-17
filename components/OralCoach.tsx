
import React, { useState, useEffect, useRef } from 'react';
import { createChatSession, ChatSession } from '../services/geminiService';
import { Mic, MicOff, Send, Sparkles, ArrowRight } from 'lucide-react';
import { AiProvider } from '../types';

const SCENARIOS = [
  { id: 'interview', title: 'Job Interview', prompt: "You are a friendly but professional hiring manager interviewing a candidate. Ask one question at a time. Correct them gently if they make major mistakes." },
  { id: 'coffee', title: 'Ordering Coffee', prompt: "You are a barista at a busy cafe. The user is a customer. Ask for their order, size, and name. Keep it casual." },
  { id: 'casual', title: 'Casual Chat', prompt: "You are a friend meeting for lunch. Ask the user how their week has been. Keep the conversation flowing naturally." },
  { id: 'custom', title: 'Custom Scenario', prompt: "" },
];

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface OralCoachProps {
  aiProvider: AiProvider;
}

// Helper for Speech Recognition types
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

export const OralCoach: React.FC<OralCoachProps> = ({ aiProvider }) => {
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom Scenario State
  const [customTopic, setCustomTopic] = useState('');
  const [customSessionStarted, setCustomSessionStarted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const chatSessionRef = useRef<ChatSession | null>(null);

  useEffect(() => {
    if (activeScenario.id === 'custom' && !customSessionStarted) {
      return;
    }

    let prompt = activeScenario.prompt;
    let title = activeScenario.title;

    if (activeScenario.id === 'custom') {
       prompt = `You are a roleplay partner. The user wants to practice: "${customTopic}". Engage in a natural conversation in this context.`;
       title = customTopic;
    }

    const systemPrompt = prompt + " IMPORTANT: If the user makes a grammar mistake, gently mention it in parenthesis at the end of your response, e.g. (Correction: ...). Keep your responses concise (under 40 words) to encourage back-and-forth conversation.";
    
    chatSessionRef.current = createChatSession(aiProvider, systemPrompt);

    setMessages([{ 
      id: 'init', 
      role: 'model', 
      text: `(Scenario: ${title} - ${aiProvider}) Hello! Ready to start?` 
    }]);
  }, [activeScenario, aiProvider, customSessionStarted]); 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await chatSessionRef.current.sendMessage(userMsg.text);
      
      const modelMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: responseText 
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      alert("Error sending message. Please check API settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMic = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  const handleStartCustom = () => {
    if (!customTopic.trim()) return;
    setMessages([]);
    setCustomSessionStarted(true);
  };

  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = SCENARIOS.find(s => s.id === e.target.value);
    if (selected) {
      setActiveScenario(selected);
      setMessages([]);
      if (selected.id === 'custom') {
        setCustomSessionStarted(false);
      } else {
        setCustomSessionStarted(false);
      }
    }
  };

  const showCustomSetup = activeScenario.id === 'custom' && !customSessionStarted;

  return (
    <div className="max-w-4xl mx-auto md:p-8 h-[calc(100vh-80px)] md:h-screen flex flex-col space-y-4 bg-slate-900 rounded-none md:rounded-3xl">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:p-0">
        <div>
           <h2 className="text-2xl font-bold text-white">Oral Coach</h2>
           <p className="text-slate-300 text-sm">Roleplay scenarios to prepare for exams.</p>
        </div>
        <select 
          value={activeScenario.id}
          onChange={handleScenarioChange}
          className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
        >
          {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
       </div>

       <div className="flex-1 bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden flex flex-col">
          
          {showCustomSetup ? (
             <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 bg-slate-800">
               <div className="w-16 h-16 bg-indigo-900 rounded-full flex items-center justify-center mb-2">
                 <Sparkles className="w-8 h-8 text-indigo-300" />
               </div>
               <div className="text-center max-w-md space-y-2">
                 <h3 className="text-xl font-bold text-white">Create Custom Scenario</h3>
                 <p className="text-slate-300">Describe who the AI should be and what you want to practice.</p>
               </div>
               
               <div className="w-full max-w-md space-y-4">
                 <textarea 
                   value={customTopic}
                   onChange={(e) => setCustomTopic(e.target.value)}
                   placeholder="e.g. You are a strict immigration officer..."
                   className="w-full p-4 rounded-xl border border-slate-600 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32"
                 />
                 <button 
                   onClick={handleStartCustom}
                   disabled={!customTopic.trim()}
                   className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                 >
                   Start Roleplay <ArrowRight className="w-5 h-5" />
                 </button>
               </div>
             </div>
          ) : (
            <>
              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/40">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[80%] p-4 rounded-2xl text-sm md:text-base leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' 
                          : 'bg-slate-700 text-white border border-slate-600 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isLoading && (
                   <div className="flex justify-start">
                     <div className="bg-slate-700 px-4 py-2 rounded-full flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75" />
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150" />
                     </div>
                   </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-slate-800 border-t border-slate-700">
                 <div className="flex items-center gap-2">
                   <button 
                      onClick={toggleMic}
                      className={`p-3 rounded-full transition-all duration-200 ${
                        isListening ? 'bg-red-900 text-red-100 animate-pulse ring-2 ring-red-500' : 'bg-slate-700 text-slate-100 hover:bg-slate-600'
                      }`}
                      title="Speak"
                   >
                     {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                   </button>
                   
                   <div className="flex-1 relative">
                     <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={isListening ? "Listening..." : "Type your response..."}
                        className="w-full p-3 pl-4 pr-10 rounded-full border border-slate-600 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                     />
                   </div>

                   <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
                   >
                     <Send className="w-5 h-5" />
                   </button>
                 </div>
              </div>
            </>
          )}
       </div>
    </div>
  );
};
