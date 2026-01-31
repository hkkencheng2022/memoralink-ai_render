
import React, { useState, useEffect } from 'react';
import { VocabularyItem, AiProvider, WritingEntry } from '../types';
import { analyzeWriting, createChatSession } from '../services/geminiService';
import { storage } from '../services/storage';
import { playTextToSpeech } from '../services/audioService';
import { BrainCircuit, Loader2, CheckCircle2, Bookmark, ArrowRight, RefreshCw, AlertCircle, BookOpen, Check, Volume2, Mic, MicOff, Save } from 'lucide-react';

interface QuizRoomProps {
  aiProvider: AiProvider;
}

export const QuizRoom: React.FC<QuizRoomProps> = ({ aiProvider }) => {
  const [library, setLibrary] = useState<VocabularyItem[]>([]);
  const [selectedWords, setSelectedWords] = useState<VocabularyItem[]>([]);
  const [scenario, setScenario] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [isResultSaved, setIsResultSaved] = useState(false);
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const saved = await storage.get<VocabularyItem[]>('memoralink_library');
        if (saved) {
          setLibrary(saved);
          setSavedWords(new Set(saved.map((i: any) => i.word)));
        }
      } catch (e) {
        console.error("Failed to load library for quiz", e);
      }
    };
    loadLibrary();
  }, []);

  const toggleWord = (word: VocabularyItem) => {
    if (selectedWords.find(w => w.word === word.word)) {
      setSelectedWords(selectedWords.filter(w => w.word !== word.word));
    } else if (selectedWords.length < 3) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const handleSaveWord = async (item: VocabularyItem) => {
    const currentLibrary = (await storage.get<VocabularyItem[]>('memoralink_library')) || [];
    
    if (!currentLibrary.some(i => i.word === item.word)) {
      const newLibrary = [item, ...currentLibrary];
      await storage.set('memoralink_library', newLibrary);
      setSavedWords(prev => new Set(prev).add(item.word));
    }
  };

  const handleSaveQuizResult = async () => {
    if (!feedback || !scenario) return;

    const entry: WritingEntry = {
      id: Date.now().toString(),
      originalText: userInput,
      correction: feedback.correction,
      improvedVersion: feedback.improvedVersion,
      explanation: feedback.explanation,
      context: `Quiz Challenge: ${scenario.substring(0, 50)}${scenario.length > 50 ? '...' : ''}`,
      date: new Date().toLocaleDateString()
    };

    const currentLibrary = (await storage.get<WritingEntry[]>('memoralink_writing_library')) || [];
    const newLibrary = [entry, ...currentLibrary];
    await storage.set('memoralink_writing_library', newLibrary);
    setIsResultSaved(true);
  };

  const handleSpeak = (text: string) => {
    playTextToSpeech(text);
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
      setUserInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  const startQuiz = async () => {
    if (selectedWords.length === 0) return;
    setLoading(true);
    setScenario(null);
    setFeedback(null);
    setUserInput('');
    setIsResultSaved(false);

    try {
      const chat = createChatSession(aiProvider, "You are a language coach. Create a short, engaging roleplay scenario (max 30 words) where the user must use specific English words to solve a problem or express an idea.");
      const wordsStr = selectedWords.map(w => w.word).join(', ');
      const res = await chat.sendMessage(`Create a scenario that requires me to use these words: ${wordsStr}.`);
      setScenario(res);
    } catch (e: any) {
      alert(`Failed to start quiz: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userInput.trim()) return;
    setLoading(true);
    try {
      // Reuse Writing Lab logic for analysis
      const res = await analyzeWriting(userInput, `Quiz Challenge Scenario: ${scenario}. Must use words: ${selectedWords.map(w => w.word).join(', ')}`, aiProvider);
      setFeedback(res);
      setIsResultSaved(false);
    } catch (e: any) {
      alert(`Analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-900">Vocabulary Quiz</h2>
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold uppercase tracking-wide">Model: {aiProvider}</span>
        </div>
        <p className="text-slate-600">Test your recall! Select words from your library and solve a generated scenario.</p>
      </div>

      {!scenario ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Select up to 3 words to practice:</h3>
            <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded-full">{selectedWords.length}/3 Selected</span>
          </div>
          
          {library.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
               <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
               <p className="text-slate-500 font-medium">Your library is empty.</p>
               <p className="text-sm text-slate-400 mt-1">Go to Vocabulary Builder to add some words first!</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-4 border rounded-xl bg-slate-50">
              {library.map((w, idx) => {
                const isSelected = selectedWords.find(sw => sw.word === w.word);
                return (
                  <button 
                    key={idx} 
                    onClick={() => toggleWord(w)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                  >
                    {w.word}
                  </button>
                );
              })}
            </div>
          )}

          <button 
            disabled={selectedWords.length === 0 || loading}
            onClick={startQuiz}
            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100"
          >
            {loading ? <Loader2 className="animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
            Generate Scenario
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
              <div className="relative z-10 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">Challenge Scenario</span>
                <p className="text-xl font-medium leading-relaxed italic">"{scenario}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Required Words:</span>
                   <div className="flex gap-2">
                     {selectedWords.map(w => <span key={w.word} className="px-3 py-1 bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm border border-indigo-400">{w.word}</span>)}
                   </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><BrainCircuit className="w-48 h-48" /></div>
           </div>

           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="relative">
                <textarea 
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  placeholder="Type your response using the target words..."
                  className="w-full p-5 pr-14 border border-slate-200 rounded-2xl bg-slate-50 min-h-[160px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                />
                <button 
                   onClick={toggleMic}
                   className={`absolute right-4 bottom-4 p-3 rounded-full transition-all duration-200 shadow-sm ${
                     isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600'
                   }`}
                   title="Speak answer"
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setScenario(null)} className="px-5 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Reset</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading || !userInput.trim()}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Check My Answer"}
                </button>
              </div>
           </div>

           {feedback && (
             <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-xl font-bold text-slate-800">Quiz Results</h3>
                  <button
                    onClick={handleSaveQuizResult}
                    disabled={isResultSaved}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                      isResultSaved 
                      ? 'bg-emerald-100 text-emerald-700 cursor-default border border-emerald-200' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
                    }`}
                  >
                    {isResultSaved ? (
                      <><Check className="w-4 h-4" /> Saved to Library</>
                    ) : (
                      <><Save className="w-4 h-4" /> Save Result</>
                    )}
                  </button>
                </div>

                {/* Grammar Check */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-l-8 border-l-emerald-500 border-slate-200">
                  <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Grammar Correction
                  </h3>
                  <p className="text-slate-800 text-xl font-medium leading-relaxed">{feedback.correction}</p>
                </div>

                {/* Native Version */}
                <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg border border-indigo-700 text-white">
                   <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Professional Upgrade
                  </h3>
                  <p className="text-xl italic font-serif leading-relaxed">"{feedback.improvedVersion}"</p>
                </div>

                {/* Suggested Vocabulary */}
                {feedback.keyVocabulary && feedback.keyVocabulary.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" /> New Vocabulary to Master
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {feedback.keyVocabulary.map((wordItem: any, idx: number) => {
                        const isSaved = savedWords.has(wordItem.word);
                        return (
                          <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-3 group hover:border-indigo-200 transition-colors">
                            <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-lg">{wordItem.word}</span>
                                  {wordItem.phonetic && <span className="text-xs text-slate-500 font-mono">{wordItem.phonetic}</span>}
                                  <button onClick={() => handleSpeak(wordItem.word)} className="p-1.5 bg-white rounded-full text-slate-400 hover:text-indigo-600 shadow-sm">
                                    <Volume2 className="w-4 h-4" />
                                  </button>
                               </div>
                               <button 
                                  onClick={() => handleSaveWord(wordItem)}
                                  disabled={isSaved}
                                  className={`p-2 rounded-full transition-all ${
                                    isSaved 
                                    ? 'text-emerald-500 bg-emerald-50' 
                                    : 'text-indigo-600 hover:bg-indigo-600 hover:text-white bg-white border border-slate-200'
                                  }`}
                                  title="Save to Library"
                               >
                                 {isSaved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                               </button>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{wordItem.definition}</p>
                            <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-100 italic">
                               <span className="font-bold block mb-1">Mnemonic:</span>
                               {wordItem.mnemonic}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Detailed Feedback */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <h4 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-3">Teaching Notes & Explanation</h4>
                  <div className="prose prose-sm text-slate-700 max-w-none">
                    <p className="whitespace-pre-wrap">{feedback.explanation}</p>
                  </div>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};
