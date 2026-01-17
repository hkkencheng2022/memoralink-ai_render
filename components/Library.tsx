
import React, { useState, useEffect, useRef } from 'react';
import { VocabularyItem, WritingEntry } from '../types';
import { Trash2, Eye, EyeOff, BookOpen, Search, Volume2, Download, FileText, ChevronDown, ChevronUp, Upload, FileJson, RefreshCw } from 'lucide-react';

type LibraryTab = 'vocabulary' | 'writing';

export const Library: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('vocabulary');
  
  // Vocabulary State
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Writing Log State
  const [writingItems, setWritingItems] = useState<WritingEntry[]>([]);
  const [expandedWriting, setExpandedWriting] = useState<Set<string>>(new Set());

  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const savedVocab = localStorage.getItem('memoralink_library');
    if (savedVocab) {
      setItems(JSON.parse(savedVocab));
    }

    const savedWriting = localStorage.getItem('memoralink_writing_library');
    if (savedWriting) {
      setWritingItems(JSON.parse(savedWriting));
    }
  };

  // --- Data Management Logic (Backup/Restore) ---

  const handleBackupData = () => {
    const backupData = {
      version: 1,
      date: new Date().toISOString(),
      vocabulary: items,
      writingLogs: writingItems
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `memoralink_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm("Warning: Restoring data will MERGE imported data with your current library. Duplicates based on IDs or words will be handled. Continue?")) {
      event.target.value = ''; // Reset input
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Validate basic structure
        if (!data.vocabulary && !data.writingLogs) {
          throw new Error("Invalid backup file format");
        }

        // Merge Vocabulary
        if (Array.isArray(data.vocabulary)) {
          const currentVocab = JSON.parse(localStorage.getItem('memoralink_library') || '[]');
          const wordSet = new Set(currentVocab.map((v: VocabularyItem) => v.word));
          const newVocab = [...currentVocab];
          
          data.vocabulary.forEach((item: VocabularyItem) => {
            if (!wordSet.has(item.word)) {
              newVocab.push(item);
              wordSet.add(item.word);
            }
          });
          
          localStorage.setItem('memoralink_library', JSON.stringify(newVocab));
        }

        // Merge Writing Logs
        if (Array.isArray(data.writingLogs)) {
          const currentLogs = JSON.parse(localStorage.getItem('memoralink_writing_library') || '[]');
          const idSet = new Set(currentLogs.map((l: WritingEntry) => l.id));
          const newLogs = [...currentLogs];

          data.writingLogs.forEach((item: WritingEntry) => {
            if (!idSet.has(item.id)) {
              newLogs.push(item);
              idSet.add(item.id);
            }
          });

          localStorage.setItem('memoralink_writing_library', JSON.stringify(newLogs));
        }

        // Refresh State
        loadData();
        alert("Data restored successfully!");
      } catch (error) {
        console.error(error);
        alert("Failed to restore data. Please ensure the file is a valid MemoraLink JSON backup.");
      } finally {
        if (event.target) event.target.value = ''; // Reset input
      }
    };
    reader.readAsText(file);
  };

  // --- Vocabulary Logic ---

  const handleDeleteVocab = (index: number) => {
    if (confirm('Remove this word from your library?')) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      localStorage.setItem('memoralink_library', JSON.stringify(newItems));
      
      const newRevealed = new Set(revealedCards);
      newRevealed.delete(index); 
      setRevealedCards(newRevealed);
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

  const handleExportAnki = () => {
    if (items.length === 0) {
      alert("Library is empty. Add some words first.");
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    items.forEach(item => {
      const front = item.word;
      const back = `
        <div style='font-weight:bold; font-size: 1.2em;'>${item.definition}</div>
        <br>
        <div style='color: #666;'>${item.phonetic || ''}</div>
        <div style='color: #888;'>${item.chineseTranslation}</div>
        <br>
        <div style='background-color: #fffbeb; padding: 10px; border-radius: 5px; border: 1px solid #fcd34d;'>
          <strong>🧠 Mnemonic:</strong> ${item.mnemonic}
        </div>
        <br>
        <div><em>Example: ${item.exampleSentence}</em></div>
      `.replace(/"/g, '""').replace(/\n/g, '');
      csvContent += `"${front}";"${back}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "memoralink_anki_import.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredItems = items.filter(item => 
    item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.chineseTranslation.includes(searchTerm)
  );

  // --- Writing Log Logic ---

  const handleDeleteWriting = (id: string) => {
    if (confirm('Delete this writing log?')) {
      const newItems = writingItems.filter(item => item.id !== id);
      setWritingItems(newItems);
      localStorage.setItem('memoralink_writing_library', JSON.stringify(newItems));
    }
  };

  const toggleWritingExpand = (id: string) => {
    const newExpanded = new Set(expandedWriting);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedWriting(newExpanded);
  };

  const filteredWriting = writingItems.filter(item => 
     item.originalText.toLowerCase().includes(searchTerm.toLowerCase()) ||
     item.improvedVersion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Hidden File Input for Restore */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">My Library</h2>
            <p className="text-slate-600">Review your learning history.</p>
          </div>
          
          <div className="flex flex-col w-full md:w-auto gap-3">
             {/* Data Management Toolbar */}
             <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={handleBackupData}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-bold border border-indigo-200"
                  title="Download a JSON backup of all your data"
                >
                  <FileJson className="w-4 h-4" /> Backup Data
                </button>
                <button 
                  onClick={handleRestoreClick}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-bold border border-indigo-200"
                  title="Import a previously saved backup file"
                >
                  <Upload className="w-4 h-4" /> Restore Data
                </button>
                {activeTab === 'vocabulary' && (
                  <button 
                    onClick={handleExportAnki}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-bold border border-slate-200"
                    title="Export current view as CSV for Anki"
                  >
                    <Download className="w-4 h-4" /> Export Anki
                  </button>
                )}
             </div>

             <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={activeTab === 'vocabulary' ? "Search words..." : "Search logs..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
           <button 
             onClick={() => setActiveTab('vocabulary')}
             className={`px-6 py-3 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${
               activeTab === 'vocabulary' 
               ? 'border-indigo-600 text-indigo-600' 
               : 'border-transparent text-slate-500 hover:text-slate-700'
             }`}
           >
             <BookOpen className="w-4 h-4" /> Vocabulary Cards
           </button>
           <button 
             onClick={() => setActiveTab('writing')}
             className={`px-6 py-3 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${
               activeTab === 'writing' 
               ? 'border-indigo-600 text-indigo-600' 
               : 'border-transparent text-slate-500 hover:text-slate-700'
             }`}
           >
             <FileText className="w-4 h-4" /> Writing Logs
           </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'vocabulary' ? (
        <>
          {items.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-200" />
              <h3 className="text-lg font-medium text-slate-900">Vocabulary library is empty</h3>
              <p className="text-slate-500 mt-2">Go to the Vocabulary Builder to generate and save words.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item, index) => {
                const isRevealed = revealedCards.has(index);
                return (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{item.word}</h3>
                        <div className="flex items-center gap-2">
                          {item.phonetic && <span className="text-xs text-slate-500 font-mono">{item.phonetic}</span>}
                          <button 
                            onClick={(e) => handleSpeak(item.word, e)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                            title="Pronounce"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => toggleReveal(index)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleDeleteVocab(index)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 flex-1 space-y-3">
                      <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Memory Aid</p>
                          <p className="text-sm text-amber-900 italic">"{item.mnemonic}"</p>
                      </div>

                      {isRevealed ? (
                        <div className="space-y-3 animate-in fade-in duration-200">
                          <div>
                            <p className="text-slate-800 text-sm">{item.definition}</p>
                            <p className="text-slate-500 text-xs mt-1">{item.chineseTranslation}</p>
                          </div>
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Context</p>
                            <p className="text-indigo-900 bg-indigo-50 p-2 rounded text-xs border-l-2 border-indigo-400">
                              "{item.exampleSentence}"
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center py-6 opacity-30">
                          <span className="text-xs">Reveal to study</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Writing Log View */
        <div className="space-y-4">
           {writingItems.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-200" />
              <h3 className="text-lg font-medium text-slate-900">No writing logs found</h3>
              <p className="text-slate-500 mt-2">Go to the Writing Lab to save your practice sessions.</p>
            </div>
           ) : (
             <div className="space-y-4">
               {filteredWriting.map((entry) => {
                 const isExpanded = expandedWriting.has(entry.id);
                 return (
                   <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
                     {/* Card Header */}
                     <div 
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleWritingExpand(entry.id)}
                     >
                       <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 mb-1">
                             <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{entry.context}</span>
                             <span className="text-xs text-slate-400">{entry.date}</span>
                          </div>
                          <p className="text-sm text-slate-900 line-clamp-1 font-medium">{entry.originalText}</p>
                       </div>
                       
                       <div className="flex items-center gap-3">
                          <span className="text-xs text-indigo-600 font-medium hidden md:block">
                            {isExpanded ? "Hide Details" : "View Critique"}
                          </span>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                          <button 
                             onClick={(e) => { e.stopPropagation(); handleDeleteWriting(entry.id); }}
                             className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                             title="Delete Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                     </div>

                     {/* Expanded Content */}
                     {isExpanded && (
                       <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-5 animate-in slide-in-from-top-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Original</h4>
                                <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 text-sm">
                                  {entry.originalText}
                                </div>
                             </div>
                             <div className="space-y-2">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Improved</h4>
                                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-indigo-900 text-sm italic font-medium">
                                  {entry.improvedVersion}
                                </div>
                             </div>
                          </div>

                          <div className="space-y-2">
                             <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Corrections & Feedback</h4>
                             <div className="bg-white p-4 rounded-lg border border-slate-200">
                                <p className="text-sm font-medium text-slate-800 mb-2">{entry.correction}</p>
                                <p className="text-sm text-slate-600 leading-relaxed">{entry.explanation}</p>
                             </div>
                          </div>
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
           )}
        </div>
      )}
    </div>
  );
};
