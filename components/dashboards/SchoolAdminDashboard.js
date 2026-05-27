'use client';

import React, { useState } from 'react';
import { 
  Users, 
  BookOpen, 
  Wallet, 
  Megaphone, 
  Calendar, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';

export default function SchoolAdminDashboard() {
  const { activeTenant, activeUser } = useAuth();
  const [notices, setNotices] = useState([
    { id: 1, title: 'Summer Vacation Circular', date: 'May 22, 2026', author: 'Principal Office', body: 'Campus will remain closed from June 1st to July 5th for summer vacations. Online classes will resume thereafter.' },
    { id: 2, title: 'IIT JEE Prep Classes', date: 'May 20, 2026', author: 'Academic Dean', body: 'Special JEE/NEET prep modules for Class XI & XII starting next Monday. Registration is mandatory.' },
    { id: 3, title: 'Sports Day Registration', date: 'May 18, 2026', author: 'PE Dept', body: 'Annual Sports Meet registrations close tomorrow. Contact physical education heads for trials.' }
  ]);
  const [newNotice, setNewNotice] = useState({ title: '', body: '' });

  const handlePostNotice = (e) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.body) {
      toast.error('Notice title and details are required');
      return;
    }
    const notice = {
      id: notices.length + 1,
      title: newNotice.title,
      body: newNotice.body,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      author: activeUser.name.split(' (')[0]
    };
    setNotices([notice, ...notices]);
    setNewNotice({ title: '', body: '' });
    toast.success('Campus circular broadcasted successfully!');
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Welcome & Campus Banner */}
      <div className="p-8 rounded-[2.5rem] bg-bg-card shadow-sm border border-border relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-indigo-500/5 z-0"></div>
        <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] rounded-full bg-accent/10 blur-[80px]"></div>
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-wider">
            <Sparkles size={10} />
            <span>Campus Principal Portal</span>
          </div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">{activeTenant?.name}</h2>
          <p className="text-text-secondary text-sm font-medium">Welcome back, Principal Admin. Standard Indian Board (CBSE) profiles sync is operational.</p>
        </div>
        <div className="relative z-10 flex flex-col items-end shrink-0 bg-slate-100/50 border border-border px-6 py-4 rounded-3xl">
          <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Academic Year</span>
          <span className="text-xl font-black text-text-primary font-outfit mt-1">2026 - 2027</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Enrolled Students', value: '1,240', icon: Users, desc: 'Aadhaar validated profiles' },
          { label: 'Active Faculty', value: '86', icon: Users, desc: 'EPF/PAN registered staff' },
          { label: 'Department Cores', value: '8', icon: BookOpen, desc: 'Science, Commerce, Arts' },
          { label: 'Fee Collections (Q1)', value: '₹48.60 Lakh', icon: Wallet, desc: 'INR Bank settlement' }
        ].map((kpi, idx) => (
          <div key={idx} className="p-6 bg-bg-sidebar border border-border rounded-3xl relative overflow-hidden group hover:border-accent/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{kpi.label}</span>
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><kpi.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-4">{kpi.value}</p>
            <p className="text-[11px] text-text-secondary mt-1 opacity-65">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* Main Grid: Notice Board & Class Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Span): Active Notice Board */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-accent" />
              <h3 className="text-lg font-black font-outfit text-text-primary tracking-tight">Active Circulars & Notices</h3>
            </div>

            <div className="space-y-4">
              {notices.map((notice) => (
                <div key={notice.id} className="p-5 bg-bg-main/40 border border-border rounded-2xl space-y-3 hover:border-accent/10 transition-all">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-black text-text-primary">{notice.title}</h4>
                    <span className="text-[10px] text-text-secondary opacity-50 font-bold">{notice.date}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{notice.body}</p>
                  <div className="flex items-center gap-2 text-[9px] text-text-secondary uppercase tracking-widest">
                    <span className="font-black text-accent">{notice.author}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Span): Broadcast Form & Quick Action List */}
        <div className="space-y-6">
          
          {/* Create Campus Circular Form */}
          <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
            <div className="flex items-center gap-2 text-text-primary">
              <Megaphone size={16} className="text-accent" />
              <h3 className="text-sm font-black uppercase tracking-wider font-outfit">Broadcast Circular</h3>
            </div>
            <form onSubmit={handlePostNotice} className="space-y-3">
              <input 
                type="text" 
                placeholder="Circular Title (e.g. CBSE Exams)"
                value={newNotice.title}
                onChange={(e) => setNewNotice({...newNotice, title: e.target.value})}
                className="w-full text-xs"
              />
              <textarea 
                placeholder="Circular details and instructions..."
                rows={4}
                value={newNotice.body}
                onChange={(e) => setNewNotice({...newNotice, body: e.target.value})}
                className="w-full text-xs bg-bg-main border border-border rounded-xl p-3 text-text-primary outline-none resize-none"
              />
              <button 
                type="submit" 
                className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Broadcast Circular</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>

          {/* Quick Stats Panel */}
          <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider font-outfit text-text-primary">Campus Activity Logs</h3>
            <div className="space-y-3">
              {[
                { activity: 'Student Aarav Patel registered for Class XI', time: '10 min ago' },
                { activity: 'Faculty Rajesh Iyer marked Class XII Physics Attendance', time: '1 hour ago' },
                { activity: 'Accountant collected ₹45,000 Term Fee payment', time: '2 hours ago' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4 text-xs">
                  <p className="text-text-secondary text-[11px] leading-snug">{item.activity}</p>
                  <span className="text-[9px] text-text-secondary opacity-40 whitespace-nowrap shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
