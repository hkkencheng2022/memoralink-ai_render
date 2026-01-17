import { useState } from 'react';
import { AppView, AiProvider } from './types';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { VocabularyBuilder } from './components/VocabularyBuilder';
import { WritingLab } from './components/WritingLab';
import { OralCoach } from './components/OralCoach';
import { Library } from './components/Library';
import { Bot, Sparkles } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [aiProvider, setAiProvider] = useState<AiProvider>('deepseek');

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard setView={setCurrentView} />;
      case AppView.VOCABULARY:
        return <VocabularyBuilder aiProvider={aiProvider} />;
      case AppView.LIBRARY:
        return <Library />;
      case AppView.WRITING:
        return <WritingLab aiProvider={aiProvider} />;
      case AppView.SPEAKING:
        return <OralCoach aiProvider={aiProvider} />;
      default:
        return <Dashboard setView={setCurrentView} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation currentView={currentView} setView={setCurrentView} />
      
      <main className="flex-1 overflow-y-auto h-screen relative flex flex-col">
        {/* Model Selector Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-40">
           <h1 className="text-sm font-bold text-slate-400 uppercase tracking-wider hidden md:block">
             {currentView.replace('_', ' ')}
           </h1>
           
           <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg ml-auto">
              <button 
                onClick={() => setAiProvider('gemini')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  aiProvider === 'gemini' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Gemini
              </button>
              <button 
                onClick={() => setAiProvider('deepseek')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  aiProvider === 'deepseek' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Bot className="w-4 h-4" />
                DeepSeek
              </button>
           </div>
        </div>

        <div className="flex-1">
          {renderView()}
        </div>
      </main>
    </div>
  );
}