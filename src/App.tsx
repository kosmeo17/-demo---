import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Droplets, 
  Plus, 
  History, 
  MessageSquare, 
  Settings, 
  Trophy, 
  Coffee, 
  Zap, 
  Brain, 
  Send,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, LogEntry, UserState, DEFAULT_GOAL } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [state, setState] = useState<UserState>(() => {
    const saved = localStorage.getItem('hydration_state');
    const today = format(new Date(), 'yyyy-MM-dd');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.lastResetDate !== today) {
        return {
          dailyGoal: parsed.dailyGoal || DEFAULT_GOAL,
          currentIntake: 0,
          logs: [],
          lastResetDate: today,
        };
      }
      return parsed;
    }
    return {
      dailyGoal: DEFAULT_GOAL,
      currentIntake: 0,
      logs: [],
      lastResetDate: today,
    };
  });

  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: '嘿！我是你的水分管理官。今天打算喝多少水？我已经准备好监督（并嘲讽）你了！' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('hydration_state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addWater = (amount: number) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      amount,
      timestamp: Date.now(),
    };
    setState(prev => ({
      ...prev,
      currentIntake: prev.currentIntake + amount,
      logs: [newLog, ...prev.logs],
    }));

    // Trigger AI response for logging
    handleAiResponse(`我刚刚喝了 ${amount}ml 水。`);
  };

  const deleteLog = (id: string) => {
    setState(prev => {
      const log = prev.logs.find(l => l.id === id);
      if (!log) return prev;
      return {
        ...prev,
        currentIntake: prev.currentIntake - log.amount,
        logs: prev.logs.filter(l => l.id !== id),
      };
    });
  };

  const handleAiResponse = async (userMsg: string) => {
    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION + `\n用户当前已喝水: ${state.currentIntake}ml, 目标: ${state.dailyGoal}ml。`,
        },
      });

      // We don't want to add the "internal" logging message to the UI if it's just a button click,
      // but if the user typed it, we do.
      // For now, let's just send it to Gemini and get a response.
      
      const response = await chat.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'ai', text: response.text || '哎呀，我渴得说不出话了...' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', text: '信号不太好，可能是我的电路缺水了。' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    await handleAiResponse(userMsg);
  };

  const progress = Math.min((state.currentIntake / state.dailyGoal) * 100, 100);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Droplets className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Hydration Officer</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">水分管理官</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <History className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stats & Progress */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Progress Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1">Today's Intake</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-light tracking-tighter">{state.currentIntake}</span>
                    <span className="text-xl text-gray-400 font-medium">ml</span>
                  </div>
                </div>
                <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl text-sm font-bold">
                  Goal: {state.dailyGoal}ml
                </div>
              </div>

              {/* Visual Water Bottle */}
              <div className="h-64 w-full bg-gray-50 rounded-3xl relative overflow-hidden border border-gray-100 mb-8">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${progress}%` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-blue-400"
                >
                  {/* Wave effect */}
                  <div className="absolute top-0 left-0 right-0 h-4 bg-white/20 -translate-y-full blur-sm" />
                </motion.div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn(
                    "text-4xl font-black transition-colors duration-500",
                    progress > 50 ? "text-white/30" : "text-blue-600/10"
                  )}>
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>

              {/* Quick Add Buttons */}
              <div className="grid grid-cols-3 gap-3">
                {[200, 350, 500].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => addWater(amount)}
                    className="group relative bg-gray-50 hover:bg-blue-600 hover:text-white p-4 rounded-2xl transition-all duration-300 flex flex-col items-center gap-1 border border-transparent hover:border-blue-400 active:scale-95"
                  >
                    <Plus className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                    <span className="font-bold">{amount}</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-60">ml</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Context Widgets */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleAiResponse("我正准备开始写代码，给我点建议。")}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 text-left group"
            >
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Brain className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm">Coding Mode</span>
              <span className="text-xs text-gray-500">Boost focus with hydration</span>
            </button>
            <button 
              onClick={() => handleAiResponse("我刚运动完，口渴死了。")}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 text-left group"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Zap className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm">Post-Workout</span>
              <span className="text-xs text-gray-500">Replenish electrolytes</span>
            </button>
          </div>

          {/* Cold Knowledge Widget */}
          <button 
            onClick={() => handleAiResponse("给我讲个关于喝水的冷知识吧。")}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-100 flex items-center gap-4 group active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Coffee className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="font-bold">Hydration Trivia</p>
              <p className="text-xs text-white/70">Surprising facts about H2O</p>
            </div>
            <Plus className="w-5 h-5 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Medals/Milestones */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Milestones</span>
            </div>
            <div className="flex gap-4">
              {[
                { threshold: 500, icon: "🌱", label: "Sprout" },
                { threshold: 1000, icon: "🌊", label: "Wave" },
                { threshold: 2000, icon: "🐳", label: "Whale" },
              ].map((m) => (
                <div 
                  key={m.label}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-500",
                    state.currentIntake >= m.threshold ? "bg-amber-50 text-amber-900 border border-amber-100" : "bg-gray-50 text-gray-300 grayscale opacity-40"
                  )}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <span className="text-[10px] font-bold uppercase">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Chat Interface */}
        <div className="lg:col-span-7 flex flex-col h-[calc(100vh-140px)]">
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm">Officer Chat</span>
              </div>
              {isTyping && (
                <div className="flex gap-1">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === 'user' ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "px-5 py-3 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-gray-100 text-gray-800 rounded-tl-none"
                    )}>
                      <Markdown>{msg.text}</Markdown>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 font-medium uppercase tracking-wider">
                      {msg.role === 'user' ? 'You' : 'Officer'}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-50">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Tell the officer something..."
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-6 pr-14 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-2 bottom-2 w-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl border-l border-gray-100 flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-xl">Intake History</h2>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {state.logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                    <History className="w-12 h-12 opacity-20" />
                    <p className="text-sm font-medium">No logs yet today.</p>
                  </div>
                ) : (
                  state.logs.map((log) => (
                    <div key={log.id} className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                          <Droplets className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{log.amount}ml</p>
                          <p className="text-xs text-gray-400 font-medium">{format(log.timestamp, 'HH:mm')}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteLog(log.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-gray-500">Daily Total</span>
                  <span className="font-bold text-xl">{state.currentIntake}ml</span>
                </div>
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to reset today\'s progress?')) {
                      setState(prev => ({ ...prev, currentIntake: 0, logs: [] }));
                    }
                  }}
                  className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset Progress
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
