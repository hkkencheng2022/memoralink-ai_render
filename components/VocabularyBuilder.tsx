
import React, { useState, useEffect } from 'react';
import { TOPICS, VocabularyItem, AiProvider } from '../types';
import { generateVocabularyByTopic, generateVocabularyFromList } from '../services/geminiService';
import { Loader2, Eye, EyeOff, BrainCircuit, Sliders, Bookmark, Check, Volume2, Upload, FileText, Zap, RefreshCw, Tag } from 'lucide-react';

interface VocabularyBuilderProps {
  aiProvider: AiProvider;
}

type Mode = 'topic' | 'import';

export const VocabularyBuilder: React.FC<VocabularyBuilderProps> = ({ aiProvider }) => {
  // Requirement 5: Persistence - Load from Session Storage if available
  const [mode, setMode] = useState<Mode>(() => {
    return (sessionStorage.getItem('vocab_mode') as Mode) || 'topic';
  });
  
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState<string>('Intermediate');
  const [count, setCount] = useState<number>(3);
  const [importText, setImportText] = useState('');

  // Requirement 5: Persistence - Load words
  const [words, setWords] = useState<VocabularyItem[]>(() => {
    const cached = sessionStorage.getItem('vocab_cached_words');
    return cached ? JSON.parse(cached) : [];
  });
  
  const [loading, setLoading] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  // Check saved status
  useEffect(() => {
    const saved = localStorage.getItem('memoralink_library');
    if (saved) {
      const parsed = JSON.parse(saved) as VocabularyItem[];
      setSavedWords(new Set(parsed.map(i => i.word)));
    }
  }, []);

  // Requirement 5: Persistence - Save to Session Storage on change
  useEffect(() => {
    sessionStorage.setItem('vocab_cached_words', JSON.stringify(words));
    sessionStorage.setItem('vocab_mode', mode);
  }, [words, mode]);

  const handleGenerate = async () => {
    setLoading(true);
    setRevealedCards(new Set());
    
    try {
      let newWords: VocabularyItem[] = [];
      if (mode === 'topic') {
        const selectedTopic = customTopic.trim() || topic;
        newWords = await generateVocabularyByTopic(selectedTopic, count, difficulty, aiProvider);
      } else {
        const rawList = importText.split(/[\n,]+/).map(w => w.trim()).filter(w => w.length > 0);
        if (rawList.length === 0) {
          alert("Please paste some words first.");
          setLoading(false);
          return;
        }
        newWords = await generateVocabularyFromList(rawList, aiProvider);
      }
      setWords(newWords); 
    } catch (error: any) {
      alert(`Failed to generate vocabulary using ${aiProvider}. Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Requirement 4: Refresh/Clear function
  const handleClear = () => {
    if (confirm("Clear all generated cards and start fresh?")) {
      setWords([]);
      setRevealedCards(new Set());
      sessionStorage.removeItem('vocab_cached_words');
    }
  };

  const toggleReveal = (index: number) => {
    const newRevealed = new Set(revealedCards);
    if (newRevealed.has(index)) {
      newRevealed.delete(index);
    } else {
      newRevealed.add(index);
    }
    setRevealedCards(newRevealed);
  };

  const handleSave = (item: VocabularyItem) => {
    const currentStorage = localStorage.getItem('memoralink_library');
    let library: VocabularyItem[] = currentStorage ? JSON.parse(currentStorage) : [];
    
    if (!library.some(i => i.word === item.word)) {
      library = [item, ...library];
      localStorage.setItem('memoralink_library', JSON.stringify(library));
      setSavedWords(prev => new Set(prev).add(item.word));
    }
  };

  const handleSpeak = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8; 
      window.speechSynthesis.cancel(); 
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24 md:pb-8">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
             <h2 className="text-2xl font-bold text-slate-900">Vocabulary Memory Builder</h2>
             <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase font-medium tracking-wide">
               {aiProvider}
             </span>
          </div>
          <p className="text-slate-600">
            Generate context-based vocabulary with mnemonics to "stick" in your brain.
          </p>
        </div>
        
        <button 
          onClick={handleClear}
          className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
          title="Clear current cards"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm font-medium">Clear & Restart</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setMode('topic')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'topic' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <Zap className="w-4 h-4" /> Generate by Topic
          </button>
          <button onClick={() => setMode('import')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'import' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <Upload className="w-4 h-4" /> Import Words
          </button>
        </div>

        {mode === 'topic' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Topic</label>
                <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none">
                  {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input type="text" placeholder="Or custom topic..." value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                  <button key={level} onClick={() => setDifficulty(level)} className={`p-2 text-sm rounded-lg border transition-all ${difficulty === level ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{level}</button>
                ))}
              </div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between"><span>Count</span><span className="text-indigo-600 font-bold">{count}</span></label>
              <input type="range" min="1" max="10" value={count} onChange={(e) => setCount(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-300">
             <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste words here..." className="w-full p-4 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-40 font-mono text-sm" />
          </div>
        )}

        <button onClick={handleGenerate} disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm hover:shadow-md">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
          {mode === 'topic' ? 'Generate Memory Cards' : 'Generate Cards from List'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {words.map((item, index) => {
          const isRevealed = revealedCards.has(index);
          const isSaved = savedWords.has(item.word);
          return (
            <div key={index} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col h-full transition-all hover:shadow-lg">
              <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{item.word}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={(e) => handleSpeak(item.word, e)} className="p-1 text-slate-400 hover:text-indigo-600"><Volume2 className="w-4 h-4" /></button>
                    {/* Updated Tag Styling: White Text */}
                    {item.tags?.map((tag, i) => (
                      <span key={i} className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded uppercase font-bold tracking-wide shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSave(item)} disabled={isSaved} className={`p-1 rounded-full transition-colors ${isSaved ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                    {isSaved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  </button>
                  <button onClick={() => toggleReveal(index)} className="text-slate-400 hover:text-indigo-600 transition-colors p-1">
                    {isRevealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="p-5 flex-1 space-y-4">
                 <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1">🧠 Mnemonic</span>
                    <p className="text-sm text-amber-900 italic">"{item.mnemonic}"</p>
                 </div>
                {isRevealed ? (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div>
                      <p className="text-slate-800">{item.definition}</p>
                      <p className="text-slate-500 text-sm mt-1">{item.chineseTranslation}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase">Context</span>
                      <p className="text-indigo-900 bg-indigo-50 p-2 rounded text-sm border-l-4 border-indigo-400">"{item.exampleSentence}"</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-8 opacity-40">
                    <p className="text-sm text-center">Tap eye icon to reveal</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
    