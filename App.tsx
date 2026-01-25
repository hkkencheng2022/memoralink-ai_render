
import React, { useState } from 'react';
import { AppView, AiProvider } from './types';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { VocabularyBuilder } from './components/VocabularyBuilder';
import { WritingLab } from './components/WritingLab';
import { OralCoach } from './components/OralCoach';
import { Library } from './components/Library';
import { QuizRoom } from './components/QuizRoom';
import { Sparkles, Cpu, Lock, ArrowRight, AlertCircle } from 'lucide-react';

// --- CONFIGURATION ---
// Get password from environment variable or default to "8888"
const APP_PASSWORD = process.env.APP_PASSWORD || "8888"; 

export default function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('memoralink_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  // App View State
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [provider, setProvider] = useState<AiProvider>('deepseek');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === APP_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('memoralink_auth', 'true');
      setLoginError(false);
    } else {
      setLoginError(true);
      // Shake animation effect could be added here
    }
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard setView={setCurrentView} />;
      case AppView.VOCABULARY:
        return <VocabularyBuilder aiProvider={provider} />;
      case AppView.LIBRARY:
        return <Library />;
      case AppView.WRITING:
        return <WritingLab aiProvider={provider} />;
      case AppView.SPEAKING:
        return <OralCoach aiProvider={provider} />;
      case AppView.QUIZ:
        return <QuizRoom aiProvider={provider} />;
      default:
        return <Dashboard setView={setCurrentView} />;
    }
  };

  // --- LOGIN SCREEN RENDER ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-indigo-600 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">MemoraLink AI</h1>
            <p className="text-indigo-100 text-sm mt-2">Private English Learning Assistant</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Access Password
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if(loginError) setLoginError(false);
                  }}
                  placeholder="Enter passcode..."
                  className={`w-full p-3 rounded-xl border ${loginError ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-slate-300 bg-slate-50 focus:ring-indigo-500'} outline-none focus:ring-2 transition-all`}
                  autoFocus
                />
                {loginError && (
                  <div className="flex items-center gap-2 mt-2 text-red-600 text-sm animate-in slide-in-from-left-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Incorrect password</span>
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200"
              >
                Unlock App <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            <p className="text-center text-xs text-slate-400 mt-6">
              Protected for personal use
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation currentView={currentView} setView={setCurrentView} />
      
      <main className="flex-1 overflow-y-auto h-screen relative flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-40">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <h1 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
               {currentView.replace('_', ' ')}
             </h1>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setProvider('deepseek')}
                  className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${provider === 'deepseek' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  DEEPSEEK
                </button>
                <button 
                  onClick={() => setProvider('gemini')}
                  className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${provider === 'gemini' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  GEMINI
                </button>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
                {provider === 'gemini' ? <Sparkles className="w-4 h-4 text-indigo-600" /> : <Cpu className="w-4 h-4 text-indigo-600" />}
                <span className="text-xs font-semibold text-indigo-700">{provider === 'gemini' ? 'Gemini AI' : 'DeepSeek AI'} Active</span>
              </div>
           </div>
        </header>

        <div className="flex-1">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
