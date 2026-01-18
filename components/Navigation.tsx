
import React from 'react';
import { AppView } from '../types';
import { BookOpen, PenTool, MessageCircle, LayoutDashboard, Library, BrainCircuit } from 'lucide-react';

interface NavigationProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppView.VOCABULARY, label: 'Vocabulary Builder', icon: BookOpen },
    { id: AppView.LIBRARY, label: 'My Library', icon: Library },
    { id: AppView.QUIZ, label: 'Vocabulary Quiz', icon: BrainCircuit },
    { id: AppView.WRITING, label: 'Writing Lab', icon: PenTool },
    { id: AppView.SPEAKING, label: 'Oral Coach', icon: MessageCircle },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 md:relative md:w-64 md:h-screen md:border-r md:border-t-0 z-50">
      <div className="flex flex-row md:flex-col h-full justify-around md:justify-start md:p-4">
        <div className="hidden md:flex items-center gap-2 mb-8 px-4 text-indigo-600">
          <BookOpen className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight">MemoraLink</span>
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col md:flex-row items-center md:gap-3 p-2 md:px-4 md:py-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'text-indigo-600 bg-indigo-50 font-medium' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-1.5'}`} />
              <span className="text-xs md:text-sm">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
