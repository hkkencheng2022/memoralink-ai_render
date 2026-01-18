
import React, { useState, useEffect } from 'react';
import { VocabularyItem, AiProvider } from '../types';
import { analyzeWriting, createChatSession } from '../services/geminiService';
import { BrainCircuit, Loader2, CheckCircle2, Bookmark, ArrowRight, RefreshCw, AlertCircle, BookOpen, Check, Volume2 } from 'lucide-react';

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('memoralink_library');
      if (saved) {
        const parsed = JSON.parse(saved);
        setLibrary(parsed);
        setSavedWords(new Set(parsed.map((i: any) => i.word)));
      }
    } catch (e) {
      console.error("Failed to load library for quiz", e);
    }
  }, []);

  const toggleWord = (word: VocabularyItem) => {
    if (selectedWords.find(w => w.word === word.word)) {
      setSelectedWords(selectedWords.filter(w => w.word !== word.word));
    } else if (selectedWords.length < 3) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const handleSaveWord = (item: VocabularyItem) => {
    const currentStorage = localStorage.getItem('memoralink_library');
    let library: VocabularyItem[] = currentStorage ? JSON.parse(currentStorage) : [];
    
    if (!library.some(i => i.word === item.word)) {
      library = [item, ...library];
      localStorage.setItem('memoralink_library', JSON.stringify(library));
      setSavedWords(prev => new Set(prev).add(item.word));
    }
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const startQuiz = async () => {
    if (selectedWords.length === 0) return;
    setLoading(true);
    setScenario(null);
    setFeedback(null);
    setUserInput('');

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
    } catch (e: any) {
      alert(`Analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Vocabulary Quiz</h2>
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold uppercase">{aiProvider}</span>
        </div>
        <p className="text-slate-600">Select words from your library and solve a generated scenario.</p>
      </div>

      {!scenario ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Select up to 3 words to practice:</h3>
            <span className="text-xs text-indigo-600 font-bold">{selectedWords.length}/3 Selected</span>
          </div>
          
          {library.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
               <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
               <p className="text-slate-500">Your library is empty. Go to Vocabulary Builder first!</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 border rounded-xl bg-slate-50">
              {library.map((w, idx) => {
                const isSelected = selectedWords.find(sw => sw.word === w.word);
                return (
                  <button 
                    key={idx} 
                    onClick={() => toggleWord(w)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:border-indigo-300'}`}
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
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-indigo-700"
          >
            {loading ? <Loader2 className="animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
            Generate Scenario
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
           <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Challenge</span>
                <p className="text-lg font-medium leading-relaxed">{scenario}</p>
                <div className="flex gap-2 pt-2">
                   <span className="text-xs text-indigo-300 mr-2">Target Words:</span>
                   {selectedWords.map(w => <span key={w.word} className="px-2 py-1 bg-white/10 rounded text-xs font-bold border border-white/20">{w.word}</span>)}
                </div>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10"><BrainCircuit className="w-24 h-24" /></div>
           </div>

           <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
              <textarea 
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                placeholder="Write your response using the target words..."
                className="w-full p-4 border rounded-xl bg-slate-50 min-h-[120px] outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <button onClick={() => setScenario(null)} className="px-4 py-2 border rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Reset</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading || !userInput.trim()}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-indigo-700"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Check My Answer"}
                </button>
              </div>
           </div>

           {feedback && (
             <div className="space-y-4 animate-in fade-in">
                {/* Grammar Check */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-emerald-500 border-slate-200">
                  <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Grammar Check
                  </h3>
                  <p className="text-slate-800 text-lg leading-relaxed">{feedback.correction}</p>
                </div>

                {/* Native Version */}
                <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl shadow-sm border border-l-4 border-l-indigo-500 border-slate-200">
                   <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Native Speaker Version
                  </h3>
                  <p className="text-slate-800 italic leading-relaxed">"{feedback.improvedVersion}"</p>
                </div>

                {/* Suggested Vocabulary */}
                {feedback.keyVocabulary && feedback.keyVocabulary.length > 0 && (
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Suggested Vocabulary
                    </h3>
                    <div className="space-y-3">
                      {feedback.keyVocabulary.map((wordItem: any, idx: number) => {
                        const isSaved = savedWords.has(wordItem.word);
                        return (
                          <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{wordItem.word}</span>
                                  {wordItem.phonetic && <span className="text-xs text-slate-500 font-mono">{wordItem.phonetic}</span>}
                                  <button onClick={() => handleSpeak(wordItem.word)} className="p-1 text-slate-400 hover:text-indigo-600">
                                    <Volume2 className="w-3 h-3" />
                                  </button>
                               </div>
                               <button 
                                  onClick={() => handleSaveWord(wordItem)}
                                  disabled={isSaved}
                                  className={`p-1.5 rounded-full transition-colors ${
                                    isSaved 
                                    ? 'text-emerald-500 bg-emerald-50' 
                                    : 'text-indigo-600 hover:bg-indigo-50 bg-white border border-slate-200'
                                  }`}
                                  title="Save to Library"
                               >
                                 {isSaved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                               </button>
                            </div>
                            <p className="text-sm text-slate-600">{wordItem.definition}</p>
                            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 italic">
                               Tip: {wordItem.mnemonic}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Detailed Feedback */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <h4 className="text-slate-500 font-bold text-xs uppercase mb-2">Feedback Notes</h4>
                  <p className="text-sm text-slate-600">{feedback.explanation}</p>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};
