'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Send, Bot, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/Providers';

export default function Chatbot() {
  const { activeRole, activeTenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const defaultText = activeRole === 'SUPER_ADMIN'
      ? `Namaste! I am the Nexus AI Assistant. How can I help you analyze global school operations today?`
      : `Namaste! I am your ${activeTenant?.name || 'Campus'} AI Assistant. How can I help you analyze operations today?`;
    setMessages([
      { id: 1, text: defaultText, sender: 'bot' }
    ]);
  }, [activeTenant, activeRole]);

  const presets = [
    { label: 'Check class conflicts', q: 'Are there any timetable conflicts or room over-allocations?' },
    { label: 'Show fee collections', q: 'What is the current fee collection summary for this quarter?' },
    { label: 'Staff payroll status', q: 'What is the total basic salary and PF deduction processed?' }
  ];

  const handleSend = (text) => {
    if (!text.trim()) return;
    
    const userMsg = { id: Date.now(), text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // AI Mock response generator
    setTimeout(() => {
      let reply = activeRole === 'SUPER_ADMIN'
        ? `I've analyzed the Nexus database schemas. All Row-Level Security parameters are configured, and operations look stable.`
        : `I've analyzed the campus database schemas. All Row-Level Security parameters are configured, and operations for this campus look stable.`;
      
      const qLower = text.toLowerCase();
      if (qLower.includes('conflict') || qLower.includes('timetable') || qLower.includes('schedule')) {
        reply = `AI Analysis: I detected 2 double-bookings in Class XII Chemistry and Room L-201 on Monday and Tuesday. Running the 'Suggest AI Optimization' tool in the Timetable module will resolve these conflicts.`;
      } else if (qLower.includes('fee') || qLower.includes('collection') || qLower.includes('rupee') || qLower.includes('due')) {
        reply = `Finance Summary: Total Q1 collections are ₹48.60 Lakh. Outstanding dues are current at 5.8%. Razorpay settlement channels are operational.`;
      } else if (qLower.includes('payroll') || qLower.includes('salary') || qLower.includes('pf') || qLower.includes('tds')) {
        reply = `HR Ledger: Total monthly payroll is ₹18.40 Lakh with ₹49,500 processed under standard Indian EPF (12%) and TDS (10%) frameworks.`;
      } else if (qLower.includes('student') || qLower.includes('aadhaar')) {
        reply = `Student Registry: We have 1,240 active students. General: 60%, OBC: 22%, SC/ST: 18%. All records carry verified 12-digit Aadhaar credentials.`;
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, text: reply, sender: 'bot' }]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-inter">
      {isOpen ? (
        /* Chat Window */
        <div className="w-[360px] h-[480px] rounded-3xl glass border border-border flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 bg-accent/10 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white"><Bot size={18} /></div>
              <div>
                <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">
                  {activeRole === 'SUPER_ADMIN' ? 'Nexus AI Core' : 'Campus AI Core'}
                </h4>
                <span className="text-[9px] text-success font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                  Active Advisory
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-text-primary p-1 hover:bg-slate-100 rounded-lg transition-all">
              <X size={16} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-[11px] leading-relaxed font-medium ${
                  m.sender === 'user' 
                    ? 'bg-accent text-white rounded-br-none' 
                    : 'bg-bg-sidebar border border-border text-text-secondary rounded-bl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-bg-sidebar border border-border p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                  <Loader2 className="animate-spin text-accent" size={14} />
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Analyzing logs...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div className="px-4 py-2 border-t border-border flex gap-1.5 overflow-x-auto custom-scrollbar shrink-0 bg-slate-50/50">
            {presets.map((p, idx) => (
              <button 
                key={idx}
                onClick={() => handleSend(p.q)}
                className="px-2.5 py-1.5 bg-bg-main hover:bg-accent/10 border border-border hover:border-accent/30 text-[9px] font-bold text-text-secondary hover:text-accent rounded-lg transition-all whitespace-nowrap"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input field */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }} 
            className="p-3 border-t border-border flex gap-2 shrink-0 bg-bg-main"
          >
            <input 
              type="text" 
              placeholder="Ask AI assistant..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 text-[11px] py-2 px-3 border border-border bg-bg-sidebar text-text-primary rounded-xl outline-none"
            />
            <button type="submit" className="p-2 bg-accent hover:bg-accent-hover text-white rounded-xl transition-all">
              <Send size={14} />
            </button>
          </form>
        </div>
      ) : (
        /* Floating Button */
        <button 
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all group border border-border"
        >
          <Sparkles className="group-hover:rotate-12 transition-transform" size={24} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-bg-main shadow-lg"></span>
        </button>
      )}
    </div>
  );
}
