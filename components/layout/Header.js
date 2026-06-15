'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Command,
  Activity,
  School,
  Sun,
  Moon,
  Smartphone,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Link from 'next/link';

export default function Header() {
  const { activeUser, activeRole, activeTenant, availableTenants, switchTenant, logout, theme, toggleTheme, sharedSchoolAlerts, setSharedSchoolAlerts, realRole, sidebarOpen, setSidebarOpen, showInstallBtn, setShowInstallModal } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = (sharedSchoolAlerts || []).filter(a => !a.read).length;

  const markAllRead = () => {
    setSharedSchoolAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  const dismissAlert = (id) => {
    setSharedSchoolAlerts(prev => prev.filter(a => a.id !== id));
  };

  // Global install modal handles installation workflow

  return (
    <header className="h-20 px-4 md:px-8 border-b border-border bg-bg-main/60 backdrop-blur-3xl flex items-center justify-between sticky top-0 z-[50] font-inter">
      
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 -ml-2 text-text-secondary hover:text-text-primary hover:bg-slate-100 rounded-xl md:hidden transition-all mr-2 shrink-0 flex items-center justify-center"
        title="Toggle Menu"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Active Campus Name Indicator */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-accent shrink-0 overflow-hidden border border-border/10">
          {activeTenant?.logo ? (
            <img src={activeTenant.logo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <School size={16} />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
            Active Campus
            {activeRole === 'SUPER_ADMIN' && (
              <span className="px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded-md text-[8px] font-bold text-accent">Switcher</span>
            )}
          </span>
          {activeRole === 'SUPER_ADMIN' ? (
            <select
              value={activeTenant?.id || ''}
              onChange={(e) => switchTenant(e.target.value)}
              className="text-sm font-black text-text-primary bg-transparent border-0 p-0 pr-6 outline-none focus:ring-0 cursor-pointer max-w-[280px] sm:max-w-xs md:max-w-md appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23475569' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right center',
                backgroundSize: '1.25rem',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {(availableTenants || []).map((t) => (
                <option key={t.id} value={t.id} className="bg-bg-sidebar text-text-primary text-xs">
                  {t.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-bold text-text-primary truncate max-w-[280px] sm:max-w-xs md:max-w-md">
              {activeTenant?.name || 'Main Campus'}
            </span>
          )}
        </div>
      </div>

      {/* Action Center */}
      <div className="flex items-center gap-5">
        
        {/* Install Mobile App PWA Button */}
        {showInstallBtn && (
          <button
            onClick={() => setShowInstallModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/20 hover:bg-accent hover:text-white rounded-xl text-[10px] font-bold text-accent transition-all animate-pulse cursor-pointer"
            title="Download Mobile App"
          >
            <Smartphone size={12} />
            <span>Install App</span>
          </button>
        )}


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
             {unreadCount > 0 ? (
               <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-accent text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 border-2 border-bg-main shadow-lg shadow-accent/30 animate-pulse">
                 {unreadCount > 9 ? '9+' : unreadCount}
               </span>
             ) : (
               <span className="absolute top-2 right-2 w-2 h-2 bg-slate-300 rounded-full border-2 border-bg-main"></span>
             )}
           </button>

           {showNotifications && (
             <>
               <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)}></div>
               <div className="absolute right-0 top-full mt-3 w-96 glass p-4 z-20 animate-in fade-in duration-200 shadow-2xl rounded-2xl max-h-[80vh] overflow-hidden flex flex-col">
                 <div className="flex items-center justify-between pb-3 mb-3 border-b border-border shrink-0">
                   <div>
                     <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">School Alerts</h4>
                     <p className="text-[9px] text-text-secondary mt-0.5">{unreadCount} unread • Online payment notifications</p>
                   </div>
                   {unreadCount > 0 && (
                     <button onClick={markAllRead} className="text-[9px] font-black text-accent hover:text-accent/80 transition-colors px-2 py-1 bg-accent/10 rounded-lg">
                       Mark all read
                     </button>
                   )}
                 </div>

                 <div className="space-y-2 overflow-y-auto flex-1 custom-scrollbar pr-1">
                   {(sharedSchoolAlerts || []).length === 0 ? (
                     <div className="py-8 text-center">
                       <Bell size={24} className="text-text-secondary mx-auto mb-2 opacity-30" />
                       <p className="text-xs font-bold text-text-secondary">No alerts yet</p>
                       <p className="text-[10px] text-text-secondary opacity-60 mt-1">Online payments from parents will appear here.</p>
                     </div>
                   ) : (
                     (sharedSchoolAlerts || []).map(alert => (
                       <div key={alert.id} className={`p-3 rounded-xl border transition-all group relative ${
                         !alert.read
                           ? alert.type === 'ONLINE_PAYMENT'
                             ? 'bg-accent/8 border-accent/25 hover:border-accent/40'
                             : 'bg-slate-50/80 border-border'
                           : 'bg-bg-main border-border/50 opacity-60'
                       }`}>
                         <div className="flex items-start gap-2.5">
                           <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                             alert.type === 'ONLINE_PAYMENT' ? 'bg-accent/15 text-accent' :
                             alert.type === 'HOSTEL_PAYMENT' ? 'bg-purple-500/15 text-purple-500' :
                             'bg-slate-100 text-text-secondary'
                           }`}>
                             <span className="text-sm">{alert.icon || '🔔'}</span>
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="flex items-start justify-between gap-1">
                               <p className="text-[11px] font-black text-text-primary leading-tight">{alert.title}</p>
                               {!alert.read && <span className="w-2 h-2 bg-accent rounded-full shrink-0 mt-1"></span>}
                             </div>
                             <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">{alert.body}</p>
                             {alert.type === 'ONLINE_PAYMENT' && (activeRole === 'ACCOUNTANT' || activeRole === 'SCHOOL_ADMIN' || activeRole === 'ADMINISTRATOR') && (
                                <div className="mt-1.5 mb-1">
                                  <Link
                                    href="/dashboard/finance?tab=online"
                                    onClick={() => setShowNotifications(false)}
                                    className="inline-flex items-center gap-1 text-[9px] bg-accent hover:bg-accent-hover text-white font-bold px-2 py-0.5 rounded-md transition-all shadow-sm"
                                  >
                                    <span>Verify Payment</span>
                                    <ChevronRight size={8} />
                                  </Link>
                                </div>
                              )}
                             <div className="flex items-center justify-between mt-1.5">
                               <span className="text-[9px] text-text-secondary opacity-50 font-mono">{alert.time}</span>
                               <button
                                 onClick={() => dismissAlert(alert.id)}
                                 className="text-[8px] text-text-secondary opacity-0 group-hover:opacity-100 hover:text-danger transition-all font-bold px-1.5 py-0.5 rounded hover:bg-danger/10"
                               >
                                 Dismiss
                               </button>
                             </div>
                           </div>
                         </div>
                       </div>
                     ))
                   )}
                 </div>

                 {(sharedSchoolAlerts || []).length > 0 && (
                   <div className="pt-3 mt-2 border-t border-border shrink-0">
                     <button
                       onClick={() => setSharedSchoolAlerts([])}
                       className="w-full py-2 text-[10px] font-bold text-text-secondary hover:text-danger hover:bg-danger/5 rounded-xl transition-all"
                     >
                       Clear all alerts
                     </button>
                   </div>
                 )}
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-[11px] shadow-lg border border-border shrink-0 overflow-hidden">
                 {activeUser?.avatar ? (
                   <img src={activeUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                   activeUser?.name?.[0] || 'U'
                 )}
              </div>
              <div className="hidden md:flex flex-col items-start translate-y-[1px] text-left">
                 <span className="text-[12px] font-bold text-text-primary leading-none mb-1">{activeUser?.name.split(' (')[0]}</span>
                 <div className="flex items-center gap-1">
                    <ShieldCheck size={10} className="text-accent" />
                    <span className="text-[8px] text-text-secondary font-black uppercase tracking-wider">{realRole || activeRole}</span>
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
                     <p className="text-xs font-bold text-text-primary truncate">{activeUser?.email || (activeRole === 'SUPER_ADMIN' ? 'admin@campuserp.in' : `admin@${activeTenant?.subdomain || 'school'}.edu.in`)}</p>
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
