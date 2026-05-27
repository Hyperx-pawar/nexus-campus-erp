'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  HelpCircle, 
  Maximize2, 
  LogOut,
  User,
  ShieldCheck,
  Settings,
  ChevronDown,
  Command,
  Activity,
  School,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '@/components/Providers';

import Link from 'next/link';

export default function Header() {
  const { activeUser, activeRole, activeTenant, logout, theme, toggleTheme } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notificationsMock = [
    { id: 1, title: 'Exam Date Sheet Out', msg: 'CBSE Term 1 date sheet has been published.', time: '2 hours ago' },
    { id: 2, title: 'Fee Invoice Generated', msg: 'Quarter 3 fee invoice ₹14,500 generated.', time: '5 hours ago' },
    { id: 3, title: 'Library Book Overdue', msg: 'Book "Concept of Physics" is overdue by 2 days.', time: '1 day ago' },
  ];

  return (
    <header className="h-20 px-8 border-b border-border bg-bg-main/60 backdrop-blur-3xl flex items-center justify-between sticky top-0 z-[50] font-inter">
      
      {/* Active Campus Name Indicator */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-accent shrink-0">
          <School size={16} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Active Campus</span>
          <span className="text-sm font-bold text-text-primary truncate max-w-[280px] sm:max-w-xs md:max-w-md">{activeTenant?.name || 'Main Campus'}</span>
        </div>
      </div>

      {/* Action Center */}
      <div className="flex items-center gap-5">
        
        {/* Institutional Status Indicator */}
        <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-100/50 border border-border rounded-xl">
           <Activity size={12} className="text-success animate-pulse" />
           <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Zone: IND-NORTH</span>
        </div>

        {/* Theme Mode Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="p-2.5 text-text-secondary hover:text-text-primary hover:bg-slate-100 rounded-xl transition-all relative"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications and Alerts */}
        <div className="relative">
           <button 
             onClick={() => setShowNotifications(!showNotifications)}
             className="p-2.5 text-text-secondary hover:text-text-primary hover:bg-slate-100 rounded-xl transition-all relative"
           >
             <Bell size={18} />
             <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-bg-main shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
           </button>

           {showNotifications && (
             <>
               <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)}></div>
               <div className="absolute right-0 top-full mt-3 w-80 glass p-4 z-20 animate-in fade-in duration-200 shadow-2xl rounded-2xl">
                 <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                   <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">Campus Alerts</h4>
                   <span className="text-[9px] font-bold text-accent">Mark all read</span>
                 </div>
                 <div className="space-y-3">
                   {notificationsMock.map(n => (
                     <div key={n.id} className="p-2.5 bg-slate-50/50 hover:bg-slate-100 border border-border rounded-xl transition-all">
                       <p className="text-xs font-bold text-text-primary leading-tight">{n.title}</p>
                       <p className="text-[10px] text-text-secondary mt-1">{n.msg}</p>
                       <span className="text-[9px] text-text-secondary opacity-40 mt-1 block">{n.time}</span>
                     </div>
                   ))}
                 </div>
               </div>
             </>
           )}
        </div>

        <div className="h-8 w-[1px] bg-slate-100"></div>

        {/* User Dropdown */}
        <div className="relative">
           <button 
             onClick={() => setIsProfileOpen(!isProfileOpen)}
             className={`flex items-center gap-3 p-1.5 pr-3 rounded-2xl transition-all border ${
               isProfileOpen ? 'bg-accent/10 border-accent/30' : 'bg-transparent border-transparent hover:bg-slate-100'
             }`}
           >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-[11px] shadow-lg border border-border shrink-0">
                 {activeUser?.name?.[0] || 'U'}
              </div>
              <div className="hidden md:flex flex-col items-start translate-y-[1px] text-left">
                 <span className="text-[12px] font-bold text-text-primary leading-none mb-1">{activeUser?.name.split(' (')[0]}</span>
                 <div className="flex items-center gap-1">
                    <ShieldCheck size={10} className="text-accent" />
                    <span className="text-[8px] text-text-secondary font-black uppercase tracking-wider">{activeRole}</span>
                 </div>
              </div>
              <ChevronDown size={14} className={`text-text-secondary transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
           </button>

           {/* Executive Context Menu */}
           {isProfileOpen && (
             <>
               <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)}></div>
               <div className="absolute right-0 top-full mt-3 w-64 glass p-3 z-20 animate-in fade-in duration-200 shadow-2xl rounded-2xl">
                  <div className="p-3 mb-2 bg-slate-100/50 border border-border rounded-xl">
                     <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-1">Corporate Account</p>
                     <p className="text-xs font-bold text-text-primary truncate">{activeUser?.email || (activeRole === 'SUPER_ADMIN' ? 'admin@nexus.in' : `admin@${activeTenant?.subdomain || 'school'}.edu.in`)}</p>
                  </div>
                  
                  <div className="space-y-1">
                     {[
                       { n: 'My Profile', i: User, h: '/dashboard/profile' },
                       { n: 'System Config', i: Settings, h: '/dashboard/settings' },
                     ].map((item, i) => (
                       <Link 
                         key={i} 
                         href={item.h}
                         onClick={() => setIsProfileOpen(false)}
                         className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-text-secondary hover:text-accent hover:bg-accent/10 rounded-xl transition-all group"
                       >
                         <item.i size={14} className="group-hover:text-accent transition-colors" />
                         <span>{item.n}</span>
                       </Link>
                     ))}
                  </div>

                  <div className="h-px bg-slate-100 my-2 mx-1"></div>
                  
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-danger hover:bg-danger/10 rounded-xl transition-all"
                  >
                    <LogOut size={14} />
                    <span>Terminate Session</span>
                  </button>
               </div>
             </>
           )}
        </div>
      </div>
    </header>
  );
}
