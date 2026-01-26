
import React, { useState, useEffect } from 'react';
import { analyzeWriting } from '../services/geminiService';
import { storage } from '../services/storage';
import { Loader2, CheckCircle2, ArrowRight, PenTool, BookOpen, Bookmark, Check, Volume2, Save, AlertCircle } from 'lucide-react';
import { AiProvider, VocabularyItem, WritingEntry } from '../types';

interface WritingLabProps {
  aiProvider: AiProvider;
}

export const WritingLab: React.FC<WritingLabProps> = ({ aiProvider }) => {
  const [text, setText] = useState('');
  
  // Context management
  const [contextPreset, setContextPreset] = useState('Professional Work Email');
  const [customContext, setCustomContext] = useState('');
  
  const [result, setResult] = useState<{ 
    correction: string, 
    explanation: string, 
    improvedVersion: string,
    keyVocabulary?: VocabularyItem[]
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [isAnalysisSaved, setIsAnalysisSaved] = useState(false);

  useEffect(() => {
    const loadSaved = async () => {
       const saved = await storage.get<VocabularyItem[]>('memoralink_library');
       if (saved) {
         setSavedWords(new Set(saved.map(i => i.word)));
       }
    };
    loadSaved();
  }, []);

  // Helper to determine the actual context string sent to AI and saved
  const getEffectiveContext = () => {
    return contextPreset === 'Custom' ? customContext : contextPreset;
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    const activeContext = getEffectiveContext();
    if (!activeContext.trim()) {
      setError("Please define your custom scenario before analyzing.");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setIsAnalysisSaved(false);
    
    try {
      const analysis = await analyzeWriting(text, activeContext, aiProvider);
      setResult(analysis);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Analysis failed. Please check your API key and internet connection.");
    } finally {
      setLoading(false);
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

  const handleSaveAnalysis = async () => {
    if (!result) return;
    
    // Ensure we save the specific custom text if Custom is selected
    const savedContext = getEffectiveContext();

    const entry: WritingEntry = {
      id: Date.now().toString(),
      originalText: text,
      correction: result.correction,
      improvedVersion: result.improvedVersion,
      explanation: result.explanation,
      context: savedContext,
      date: new Date().toLocaleDateString()
    };

    const currentLibrary = (await storage.get<WritingEntry[]>('memoralink_writing_library')) || [];
    const newLibrary = [entry, ...currentLibrary];
    await storage.set('memoralink_writing_library', newLibrary);
    setIsAnalysisSaved(true);
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
           <h2 className="text-2xl font-bold text-slate-900">Writing Lab</h2>
           <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase font-medium tracking-wide">
             Model: {aiProvider}
           </span>
        </div>
        <p className="text-slate-600">Practice writing. AI will improve your text and suggest sophisticated vocabulary to add to your library.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        <div className="space-y-4 flex flex-col h-full">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
            <label className="block text-sm font-medium text-slate-700 mb-2">Context / Scenario</label>
            <select 
              value={contextPreset}
              onChange={(e) => setContextPreset(e.target.value)}
              className="w-full p-2 mb-3 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option>Professional Work Email</option>
              <option>Academic Essay</option>
              <option>Casual Message</option>
              <option>Daily Journal</option>
              <option value="Custom">Custom Scenario...</option>
            </select>

            {contextPreset === 'Custom' && (
              <div className="mb-4 animate-in fade-in slide-in-from-top-2">
                <input 
                  type="text"
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  placeholder="E.g., Complaint letter to landlord, Love letter, Asking for a refund..."
                  className="w-full p-2 rounded-lg border border-indigo-200 bg-indigo-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>
            )}
            
            <label className="block text-sm font-medium text-slate-700 mb-2">Your Draft</label>
            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full flex-1 p-3 rounded-lg border border-slate-300 bg-slate-800 text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[200px]"
              placeholder="Type your sentence or paragraph here..."
            />
            
            <button 
              onClick={handleAnalyze}
              disabled={loading || !text}
              className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze & Improve"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-bold">Analysis Error</p>
                <p>{error}</p>
                <p className="mt-2 text-xs opacity-80">
                  Make sure your {aiProvider === 'deepseek' ? 'DeepSeek' : 'Gemini'} API key is correctly set in your environment variables.
                </p>
              </div>
            </div>
          )}

          {result ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                 <h3 className="text-lg font-bold text-slate-800">Results</h3>
                 <button
                   onClick={handleSaveAnalysis}
                   disabled={isAnalysisSaved}
                   className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                     isAnalysisSaved 
                     ? 'bg-emerald-100 text-emerald-700 cursor-default' 
                     : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
                   }`}
                 >
                   {isAnalysisSaved ? (
                     <><Check className="w-4 h-4" /> Saved to Library</>
                   ) : (
                     <><Save className="w-4 h-4" /> Save Analysis</>
                   )}
                 </button>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-emerald-500 border-slate-200">
                <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Grammar Check
                </h3>
                <p className="text-slate-800 text-lg leading-relaxed">{result.correction}</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl shadow-sm border border-l-4 border-l-indigo-500 border-slate-200">
                 <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" /> Native Speaker Version
                </h3>
                <p className="text-slate-800 italic leading-relaxed">"{result.improvedVersion}"</p>
              </div>

              {result.keyVocabulary && result.keyVocabulary.length > 0 && (
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Suggested Vocabulary
                  </h3>
                  <div className="space-y-3">
                    {result.keyVocabulary.map((wordItem, idx) => {
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

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Feedback Notes</h3>
                 <div className="prose prose-sm text-slate-600">
                    <p>{result.explanation}</p>
                 </div>
              </div>
            </div>
          ) : !loading && !error && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100/50 rounded-xl border border-dashed border-slate-300 p-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <PenTool className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-center">Write something on the left to see corrections, professional upgrades, and vocabulary suggestions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
