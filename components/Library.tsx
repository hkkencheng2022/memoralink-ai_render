
import React, { useState, useEffect, useRef } from 'react';
import { VocabularyItem, WritingEntry } from '../types';
import { Trash2, Eye, EyeOff, BookOpen, Search, Volume2, Download, FileText, ChevronDown, ChevronUp, Upload, FileJson, Tag, Edit3, X, Check } from 'lucide-react';

type LibraryTab = 'vocabulary' | 'writing';

export const Library: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('vocabulary');
  
  // Vocabulary State
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Editing State (Req 2)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempTags, setTempTags] = useState('');

  // Writing Log State
  const [writingItems, setWritingItems] = useState<WritingEntry[]>([]);
  const [expandedWriting, setExpandedWriting] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const savedVocab = localStorage.getItem('memoralink_library');
      if (savedVocab) setItems(JSON.parse(savedVocab));
      const savedWriting = localStorage.getItem('memoralink_writing_library');
      if (savedWriting) setWritingItems(JSON.parse(savedWriting));
    } catch(e) {
      console.error("Failed to load library", e);
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
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.vocabulary) localStorage.setItem('memoralink_library', JSON.stringify(data.vocabulary));
        if (data.writingLogs) localStorage.setItem('memoralink_writing_library', JSON.stringify(data.writingLogs));
        loadData(); alert("Data restored!");
      } catch (error) { alert("Invalid file"); }
    };
    reader.readAsText(file);
  };

  // --- Vocabulary Logic ---
  const handleDeleteVocab = (index: number) => {
    if (confirm('Remove this word?')) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      localStorage.setItem('memoralink_library', JSON.stringify(newItems));
    }
  };

  // Req 2: Edit Tags
  const startEditing = (index: number, tags: string[] = []) => {
    setEditingIndex(index);
    setTempTags(tags.join(', '));
  };

  const saveTags = (index: number) => {
    const newItems = [...items];
    const tagsArray = tempTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    newItems[index].tags = tagsArray;
    setItems(newItems);
    localStorage.setItem('memoralink_library', JSON.stringify(newItems));
    setEditingIndex(null);
  };

  // Req 3: Enhanced Export
  const handleExportAnki = () => {
    if (items.length === 0) return;
    // Format: Word; Meaning; Chinese; Mnemonic; Example; Tags; Phonetic
    let csvContent = "data:text/csv;charset=utf-8,Word;Definition;Chinese;Mnemonic;Example;Tags;Phonetic\n";
    items.forEach(item => {
      const tags = item.tags ? item.tags.join(', ') : '';
      // Escape quotes for CSV
      const clean = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      csvContent += `${clean(item.word)};${clean(item.definition)};${clean(item.chineseTranslation)};${clean(item.mnemonic)};${clean(item.exampleSentence)};${clean(tags)};${clean(item.phonetic || '')}\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "memoralink_full_export.csv";
    link.click();
  };

  // Req 2: Search tags
  const filteredItems = items.filter(item => 
    item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.chineseTranslation.includes(searchTerm) ||
    (item.tags && item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-slate-900">My Library</h2></div>
        <div className="flex flex-wrap items-center gap-2">
           <button onClick={handleBackupData} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-2"><FileJson className="w-4 h-4" /> Backup</button>
           <button onClick={handleRestoreClick} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-2"><Upload className="w-4 h-4" /> Restore</button>
           {activeTab === 'vocabulary' && (
             <button onClick={handleExportAnki} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-2"><Download className="w-4 h-4" /> 匯出卡庫 (CSV)</button>
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
            <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3 relative group">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">{item.word}</h3>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs text-slate-500 font-mono">{item.phonetic}</span>
                     <button onClick={() => { if('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(item.word); u.lang='en-US'; window.speechSynthesis.speak(u); } }} className="text-slate-400 hover:text-indigo-600"><Volume2 className="w-3 h-3" /></button>
                  </div>
                </div>
                <div className="flex gap-1">
                   <button onClick={() => { const newS = new Set(revealedCards); if(newS.has(index)) newS.delete(index); else newS.add(index); setRevealedCards(newS); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                   <button onClick={() => handleDeleteVocab(index)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Tag Section - Updated to white text */}
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
                <div className="text-sm space-y-1 animate-in fade-in">
                   <p>{item.definition}</p>
                   <p className="text-slate-500 text-xs">{item.chineseTranslation}</p>
                   <p className="text-indigo-700 bg-indigo-50 p-1.5 rounded text-xs border-l-2 border-indigo-400">"{item.exampleSentence}"</p>
                </div>
              )}
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
    