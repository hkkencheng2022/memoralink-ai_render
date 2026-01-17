import React from 'react';
import { AppView } from '../types';
import { Brain, ArrowRight, Zap, Target } from 'lucide-react';

interface DashboardProps {
  setView: (view: AppView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10 pb-24 md:pb-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Brain className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-6">Master English with Context & Memory</h1>
          <p className="text-indigo-100 text-lg mb-8 leading-relaxed">
            Struggling to remember words? Our AI uses <span className="font-bold text-white">Mnemonics</span> and <span className="font-bold text-white">Real-Life Scenarios</span> to help you retain vocabulary for work and oral exams.
          </p>
          <button 
            onClick={() => setView(AppView.VOCABULARY)}
            className="bg-white text-indigo-600 px-8 py-3 rounded-full font-bold hover:bg-indigo-50 transition-colors inline-flex items-center gap-2"
          >
            Start Training Now <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => setView(AppView.VOCABULARY)}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Memory Boost</h3>
          <p className="text-slate-600 text-sm">Generate vocabulary with custom mnemonics designed to stick in your long-term memory.</p>
        </div>

        <div 
           onClick={() => setView(AppView.SPEAKING)}
           className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Target className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Oral Exam Prep</h3>
          <p className="text-slate-600 text-sm">Simulate job interviews or daily chats. Get instant feedback on your spoken grammar.</p>
        </div>

        <div 
           onClick={() => setView(AppView.WRITING)}
           className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Brain className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Writing Lab</h3>
          <p className="text-slate-600 text-sm">Turn basic sentences into professional emails with AI rewriting and analysis.</p>
        </div>
      </div>
    </div>
  );
};