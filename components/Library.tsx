
import React, { useState, useEffect, useRef } from 'react';
import { VocabularyItem, WritingEntry } from '../types';
import { storage } from '../services/storage';
import { Trash2, Eye, Search, Volume2, Download, ChevronDown, ChevronUp, Upload, FileJson, Edit3, X, Check, Image as ImageIcon, Maximize2, Loader2 } from 'lucide-react';

type LibraryTab = 'vocabulary' | 'writing';

export const Library: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('vocabulary');
  
  // Vocabulary State
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempTags, setTempTags] = useState('');

  // Focus/Zoom Mode State
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Writing Log State
  const [writingItems, setWritingItems] = useState<WritingEntry[]>([]);
  const [expandedWriting, setExpandedWriting] = useState<Set<string>>(new Set());

  // Refs for File Inputs
  const fileInputRef = useRef<HTMLInputElement>(null); // For JSON restore
  const imageInputRef = useRef<HTMLInputElement>(null); // For Image upload
  const uploadTargetIndex = useRef<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const savedVocab = await storage.get<VocabularyItem[]>('memoralink_library');
      if (savedVocab) setItems(savedVocab);
      
      const savedWriting = await storage.get<WritingEntry[]>('memoralink_writing_library');
      if (savedWriting) setWritingItems(savedWriting);
    } catch(e) {
      console.error("Failed to load library", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleBackupData = () => {
    const backupData = { version: 1, date: new Date().toISOString(), vocabulary: items, writingLogs: writingItems };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `memoralink_backup.json`;
    a.click();
  };

  const handleRestoreClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsLoadingData(true);
        const data = JSON.parse(e.target?.result as string);
        
        if (data.vocabulary) {
          await storage.set('memoralink_library', data.vocabulary);
          setItems(data.vocabulary);
        }
        if (data.writingLogs) {
          await storage.set('memoralink_writing_library', data.writingLogs);
          setWritingItems(data.writingLogs);
        }
        
        alert(`Restore successful! Loaded ${data.vocabulary?.length || 0} words.`);
      } catch (error) { 
        console.error(error);
        alert("Invalid file or restore failed."); 
      } finally {
        setIsLoadingData(false);
        // Clear input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // --- Image Upload Logic ---
  const triggerImageUpload = (index: number) => {
    uploadTargetIndex.current = index;
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || uploadTargetIndex.current === null) return;

    // Warning for very large images, though IDB can handle them better than LocalStorage
    if (file.size > 5000000) { // 5MB warning
       if (!confirm("This image is quite large (>5MB). It may slow down loading. Continue?")) return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64String = e.target?.result as string;
      const newItems = [...items];
      newItems[uploadTargetIndex.current!] = {
        ...newItems[uploadTargetIndex.current!],
        image: base64String
      };
      setItems(newItems);
      await storage.set('memoralink_library', newItems);
      
      // Reset input
      if (imageInputRef.current) imageInputRef.current.value = '';
      uploadTargetIndex.current = null;
    };
    reader.readAsDataURL(file);
  };

  // --- Vocabulary Logic ---
  const handleDeleteVocab = async (index: number) => {
    if (confirm('Remove this word?')) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      await storage.set('memoralink_library', newItems);
    }
  };
  
  const handleClearAll = async () => {
    if (confirm("⚠️ WARNING: Are you sure you want to delete ALL data from your library? This action cannot be undone.")) {
      setItems([]);
      setWritingItems([]);
      setRevealedCards(new Set());
      await storage.clearAll();
    }
  };

  // Edit Tags
  const startEditing = (index: number, tags: string[] = []) => {
    setEditingIndex(index);
    setTempTags(tags.join(', '));
  };

  const saveTags = async (index: number) => {
    const newItems = [...items];
    const tagsArray = tempTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    newItems[index].tags = tagsArray;
    setItems(newItems);
    await storage.set('memoralink_library', newItems);
    setEditingIndex(null);
  };

  const handleExportCSV = () => {
    if (items.length === 0) return;
    
    // Add BOM (\uFEFF) so Excel opens it with correct UTF-8 encoding
    let csvContent = "\uFEFFWord;Definition;Chinese註解;Mnemonic;Example\n";
    
    items.forEach(item => {
      // Helper to escape quotes within the text
      const clean = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      
      csvContent += `${clean(item.word)};${clean(item.definition)};${clean(item.chineseTranslation)};${clean(item.mnemonic)};${clean(item.exampleSentence)}\n`;
    });

    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    link.download = "memoralink_export.csv";
    link.click();
  };

  const filteredItems = items.filter(item => 
    item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.chineseTranslation.includes(searchTerm) ||
    (item.tags && item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang='en-US'; 
      window.speechSynthesis.speak(u); 
    }
  };

  // --- Focus Modal Content ---
  const focusedItem = focusedIndex !== null ? filteredItems[focusedIndex] : null;

  if (isLoadingData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-slate-600">Loading Library...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      <input type="file" ref={imageInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />
      
      {/* Focus Modal */}
      {focusedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center p-4 animate-in fade-in duration-200">
           <button 
             onClick={() => setFocusedIndex(null)} 
             className="absolute top-4 right-4 z-50 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
           >
             <X className="w-6 h-6" />
           </button>

           <div className="w-full max-w-6xl h-[90vh] bg-white rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
              {/* Image Section (2/3) */}
              <div className="w-full md:w-2/3 bg-black relative flex items-center justify-center h-1/2 md:h-full">
                 {focusedItem.image ? (
                   <img src={focusedItem.image} alt={focusedItem.word} className="w-full h-full object-contain" />
                 ) : (
                   <div className="flex flex-col items-center justify-center text-white/30 gap-4">
                      <ImageIcon className="w-24 h-24 opacity-50" />
                      <span className="text-lg font-medium">No image uploaded</span>
                   </div>
                 )}
              </div>

              {/* Text Section (1/3) */}
              <div className="w-full md:w-1/3 h-1/2 md:h-full bg-white p-8 md:p-10 overflow-y-auto flex flex-col relative">
                 <div className="mb-8">
                    <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider mb-4">
                      {focusedItem.tags?.[0] || 'Vocabulary'}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-2">{focusedItem.word}</h2>
                    <div className="flex items-center gap-3">
                       <span className="text-xl text-slate-500 font-mono">{focusedItem.phonetic}</span>
                       <button onClick={(e) => handleSpeak(focusedItem.word, e)} className="p-2 bg-slate-100 rounded-full hover:bg-indigo-100 text-indigo-600 transition-colors">
                         <Volume2 className="w-5 h-5" />
                       </button>
                    </div>
                 </div>

                 <div className="space-y-8 flex-1">
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                       <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-2">🧠 Memory Hook</span>
                       <p className="text-xl text-amber-900 font-medium italic leading-relaxed">"{focusedItem.mnemonic}"</p>
                    </div>

                    <div className="space-y-4">
                       <div>
                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1">Definition</h3>
                         <p className="text-lg font-medium text-slate-800">{focusedItem.definition}</p>
                       </div>
                       
                       <div>
                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1">Translation</h3>
                         <p className="text-lg text-slate-700">{focusedItem.chineseTranslation}</p>
                       </div>

                       <div>
                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1">Example</h3>
                         <p className="text-indigo-900 italic">"{focusedItem.exampleSentence}"</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-slate-900">My Library</h2></div>
        <div className="flex flex-wrap items-center gap-2">
           <button onClick={handleBackupData} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-2"><FileJson className="w-4 h-4" /> Backup</button>
           <button onClick={handleRestoreClick} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-2"><Upload className="w-4 h-4" /> Restore</button>
           
           <button onClick={handleClearAll} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-200 flex items-center gap-2 hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /> Clear All</button>

           {activeTab === 'vocabulary' && (
             <button onClick={handleExportCSV} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-2"><Download className="w-4 h-4" /> CSV</button>
           )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search words or tags..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
      </div>

      <div className="flex border-b border-slate-200">
         <button onClick={() => setActiveTab('vocabulary')} className={`px-6 py-3 font-medium text-sm border-b-2 ${activeTab === 'vocabulary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Vocabulary Cards</button>
         <button onClick={() => setActiveTab('writing')} className={`px-6 py-3 font-medium text-sm border-b-2 ${activeTab === 'writing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Writing Logs</button>
      </div>

      {activeTab === 'vocabulary' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative group flex flex-col gap-4">
              
              {/* Image Area (16:9) */}
              <div 
                className="w-full aspect-video bg-slate-100 rounded-lg overflow-hidden relative group/image cursor-pointer border border-slate-100"
                onClick={() => setFocusedIndex(index)}
              >
                 {item.image ? (
                   <>
                     <img src={item.image} alt={item.word} className="w-full h-full object-cover" />
                     {/* Overlay Actions */}
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setFocusedIndex(index); }} 
                          className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-colors"
                          title="Focus Mode"
                        >
                          <Maximize2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); triggerImageUpload(index); }} 
                          className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/40 transition-colors"
                          title="Change Image"
                        >
                          <ImageIcon className="w-5 h-5" />
                        </button>
                     </div>
                   </>
                 ) : (
                   <button 
                     onClick={(e) => { e.stopPropagation(); triggerImageUpload(index); }}
                     className="w-full h-full flex flex-col items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-500 transition-colors gap-2"
                   >
                     <ImageIcon className="w-8 h-8 opacity-50" />
                     <span className="text-xs font-medium">Add Visual Memory</span>
                   </button>
                 )}
              </div>

              <div className="space-y-3 flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 cursor-pointer hover:text-indigo-600" onClick={() => setFocusedIndex(index)}>{item.word}</h3>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-xs text-slate-500 font-mono">{item.phonetic}</span>
                       <button onClick={(e) => handleSpeak(item.word, e)} className="text-slate-400 hover:text-indigo-600"><Volume2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <div className="flex gap-1">
                     <button onClick={() => { const newS = new Set(revealedCards); if(newS.has(index)) newS.delete(index); else newS.add(index); setRevealedCards(newS); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                     <button onClick={() => handleDeleteVocab(index)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Tag Section */}
                <div className="flex flex-wrap gap-1 items-center min-h-[24px]">
                  {editingIndex === index ? (
                    <div className="flex items-center gap-1 w-full animate-in fade-in">
                      <input autoFocus value={tempTags} onChange={e => setTempTags(e.target.value)} className="flex-1 text-xs border p-1 rounded" placeholder="Tags (comma separated)" />
                      <button onClick={() => saveTags(index)} className="text-indigo-600"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingIndex(null)} className="text-slate-400"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      {item.tags?.map((t, i) => <span key={i} className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold uppercase">{t}</span>)}
                      <button onClick={() => startEditing(index, item.tags)} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit Tags"><Edit3 className="w-3 h-3" /></button>
                    </>
                  )}
                </div>

                <div className="bg-amber-50 p-2 rounded text-xs italic text-amber-900">"{item.mnemonic}"</div>
                
                {revealedCards.has(index) && (
                  <div className="text-sm space-y-2 animate-in fade-in pt-2 border-t border-slate-100">
                     <p className="font-medium text-slate-800">{item.definition}</p>
                     <p className="text-slate-500 text-xs">{item.chineseTranslation}</p>
                     <p className="text-indigo-700 bg-indigo-50 p-2 rounded text-xs border-l-2 border-indigo-400 italic">"{item.exampleSentence}"</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
           {writingItems.map(entry => (
             <div key={entry.id} className="bg-white rounded-xl p-4 border shadow-sm">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => { const n = new Set(expandedWriting); if(n.has(entry.id)) n.delete(entry.id); else n.add(entry.id); setExpandedWriting(n); }}>
                   <div>
                     <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded">{entry.context}</span>
                     <p className="text-sm font-medium mt-1">{entry.originalText}</p>
                   </div>
                   {expandedWriting.has(entry.id) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
                {expandedWriting.has(entry.id) && (
                  <div className="mt-4 pt-4 border-t space-y-3 bg-slate-50 p-3 rounded">
                     <div className="grid md:grid-cols-2 gap-4">
                        <div><p className="text-xs font-bold text-slate-500">Original</p><p className="text-sm">{entry.originalText}</p></div>
                        <div><p className="text-xs font-bold text-indigo-600">Improved</p><p className="text-sm text-indigo-800 italic">{entry.improvedVersion}</p></div>
                     </div>
                     <div><p className="text-xs font-bold text-emerald-600">Correction</p><p className="text-sm">{entry.explanation}</p></div>
                  </div>
                )}
             </div>
           ))}
        </div>
      )}
    </div>
  );
};
