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
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const { 
    activeUser, 
    activeRole, 
    activeTenant, 
    availableTenants, 
    switchTenant, 
    logout, 
    theme, 
    toggleTheme, 
    sharedSchoolAlerts, 
    setSharedSchoolAlerts, 
    realRole, 
    sidebarOpen, 
    setSidebarOpen, 
    showInstallBtn, 
    setShowInstallModal,
    sharedStudents,
    sharedParents,
    sharedNotifications,
    setSharedNotifications
  } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const handleAlertClick = (alert) => {
    // Mark as read
    if (!alert.read) {
      if (activeRole === 'PARENT' || activeRole === 'STUDENT') {
        setSharedNotifications(prev => (prev || []).map(a => a.id === alert.id ? { ...a, read: true } : a));
      } else {
        setSharedSchoolAlerts(prev => (prev || []).map(a => a.id === alert.id ? { ...a, read: true } : a));
      }
    }

    setShowNotifications(false);

    // Open detailed dialog modal first so user can view it clearly, then they can navigate if they want
    setSelectedAlert(alert);
  };

  // Resolve profiles
  const myParentProfile = React.useMemo(() => {
    return (sharedParents || []).find(p => p.tenant_id === activeTenant?.id && p.email === activeUser?.email) || 
      (sharedParents || []).find(p => p.tenant_id === activeTenant?.id);
  }, [sharedParents, activeTenant, activeUser]);

  const myStudentProfile = React.useMemo(() => {
    return (sharedStudents || []).find(s => s.tenant_id === activeTenant?.id && s.email === activeUser?.email) ||
      (sharedStudents || []).find(s => s.tenant_id === activeTenant?.id);
  }, [sharedStudents, activeTenant, activeUser]);

  // Dynamic role-aware alert feed
  const currentAlerts = React.useMemo(() => {
    if (!activeTenant) return [];
    if (activeRole === 'PARENT') {
      return (sharedNotifications || []).filter(
        n => n.tenant_id === activeTenant.id && n.recipient_id === (myParentProfile?.id || '')
      );
    }
    if (activeRole === 'STUDENT') {
      return (sharedNotifications || []).filter(
        n => n.tenant_id === activeTenant.id && 
          (n.recipient_id === myStudentProfile?.id || n.recipient_id === 'parent-1' || n.title.includes(myStudentProfile?.first_name || ''))
      );
    }
    // Default: Staff alerts
    return (sharedSchoolAlerts || []).filter(a => a.tenant_id === activeTenant.id);
  }, [activeRole, activeTenant, myParentProfile, myStudentProfile, sharedNotifications, sharedSchoolAlerts]);

  const unreadCount = React.useMemo(() => {
    return (currentAlerts || []).filter(a => !a.read).length;
  }, [currentAlerts]);

  const markAllRead = () => {
    if (activeRole === 'PARENT' || activeRole === 'STUDENT') {
      const visibleIds = new Set(currentAlerts.map(a => a.id));
      setSharedNotifications(prev => (prev || []).map(a => visibleIds.has(a.id) ? { ...a, read: true } : a));
    } else {
      setSharedSchoolAlerts(prev => (prev || []).map(a => ({ ...a, read: true })));
    }
  };

  const dismissAlert = (id) => {
    if (activeRole === 'PARENT' || activeRole === 'STUDENT') {
      setSharedNotifications(prev => (prev || []).filter(a => a.id !== id));
    } else {
      setSharedSchoolAlerts(prev => (prev || []).filter(a => a.id !== id));
    }
  };

  const clearAllAlerts = () => {
    if (activeRole === 'PARENT' || activeRole === 'STUDENT') {
      const visibleIds = new Set(currentAlerts.map(a => a.id));
      setSharedNotifications(prev => (prev || []).filter(a => !visibleIds.has(a.id)));
    } else {
      setSharedSchoolAlerts([]);
    }
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
                      <h4 className="text-xs font-black text-text-primary uppercase tracking-wider animate-pulse-subtle">
                        {activeRole === 'PARENT' ? 'Parent Alerts' : activeRole === 'STUDENT' ? 'Student Alerts' : 'School Alerts'}
                      </h4>
                      <p className="text-[9px] text-text-secondary mt-0.5">{unreadCount} unread • Notification Center</p>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[9px] font-black text-accent hover:text-accent/80 transition-colors px-2 py-1 bg-accent/10 rounded-lg">
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 overflow-y-auto flex-1 custom-scrollbar pr-1">
                    {(currentAlerts || []).length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell size={24} className="text-text-secondary mx-auto mb-2 opacity-30 animate-pulse" />
                        <p className="text-xs font-bold text-text-secondary">No alerts yet</p>
                        <p className="text-[10px] text-text-secondary opacity-60 mt-1">
                          {activeRole === 'PARENT' ? 'Real-time student attendance and fee updates appear here.' :
                           activeRole === 'STUDENT' ? 'Your grading and academic progress alerts appear here.' :
                           'Online payments and portal warnings appear here.'}
                        </p>
                      </div>
                    ) : (
                      (currentAlerts || []).map(alert => (
                        <div 
                          key={alert.id} 
                          onClick={() => handleAlertClick(alert)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer active:scale-[0.99] group relative ${
                            !alert.read
                              ? 'bg-accent/8 border-accent/25 hover:border-accent/40 hover:bg-accent/10 shadow-sm'
                              : 'bg-bg-main border-border/50 hover:border-accent/20 opacity-60'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              alert.type === 'ONLINE_PAYMENT' || alert.type === 'FEE_PAYMENT' ? 'bg-emerald-500/15 text-emerald-500' :
                              alert.type === 'ABSENCE' ? 'bg-red-500/15 text-red-500' :
                              alert.type === 'HOSTEL_PAYMENT' ? 'bg-purple-500/15 text-purple-500' :
                              'bg-accent/15 text-accent'
                            }`}>
                              <span className="text-sm">
                                {alert.icon ? alert.icon :
                                 alert.type === 'ABSENCE' ? '🚨' :
                                 alert.type === 'ONLINE_PAYMENT' || alert.type === 'FEE_PAYMENT' ? '✅' : '🔔'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <p className="text-[11px] font-black text-text-primary leading-tight group-hover:text-accent transition-colors">{alert.title}</p>
                                {!alert.read && <span className="w-2 h-2 bg-accent rounded-full shrink-0 mt-1"></span>}
                              </div>
                              <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed truncate">{alert.body}</p>
                              
                              <div className="flex items-center justify-between mt-1.5">
                                <span className="text-[9px] text-text-secondary opacity-50 font-mono">{alert.time || alert.date}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissAlert(alert.id);
                                  }}
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

                  {(currentAlerts || []).length > 0 && (
                    <div className="pt-3 mt-2 border-t border-border shrink-0">
                      <button
                        onClick={clearAllAlerts}
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
      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-white border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedAlert.type === 'ONLINE_PAYMENT' || selectedAlert.type === 'FEE_PAYMENT' ? 'bg-emerald-500/15 text-emerald-500' :
                  selectedAlert.type === 'ABSENCE' ? 'bg-red-500/15 text-red-500' :
                  selectedAlert.type === 'HOSTEL_PAYMENT' ? 'bg-purple-500/15 text-purple-500' :
                  'bg-accent/15 text-accent'
                }`}>
                  <span className="text-base font-bold">
                    {selectedAlert.icon ? selectedAlert.icon :
                     selectedAlert.type === 'ABSENCE' ? '🚨' :
                     selectedAlert.type === 'ONLINE_PAYMENT' || selectedAlert.type === 'FEE_PAYMENT' ? '✅' : '🔔'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Alert Details</h3>
                  <p className="text-[9px] text-text-secondary font-mono">{selectedAlert.time || selectedAlert.date || 'Just now'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAlert(null)}
                className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <h4 className="text-sm font-black text-text-primary leading-snug">
                {selectedAlert.title}
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line bg-slate-50 p-4 border border-border/80 rounded-2xl">
                {selectedAlert.body}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-slate-50 flex flex-col sm:flex-row gap-2 justify-end">
              {/* Context-aware Actions */}
              {(selectedAlert.type === 'ONLINE_PAYMENT' || selectedAlert.type === 'FEE_PAYMENT') && (
                <button
                  onClick={() => {
                    setSelectedAlert(null);
                    if (activeRole === 'ACCOUNTANT' || activeRole === 'SCHOOL_ADMIN' || activeRole === 'ADMINISTRATOR') {
                      router.push('/dashboard/finance?tab=online');
                    } else {
                      router.push('/dashboard/finance');
                    }
                  }}
                  className="px-4 py-2 bg-accent text-white hover:bg-accent-hover text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <span>Go to Finance</span>
                  <ChevronRight size={12} />
                </button>
              )}

              {(selectedAlert.type === 'ABSENCE' || selectedAlert.type === 'ATTENDANCE') && (
                <button
                  onClick={() => {
                    setSelectedAlert(null);
                    router.push('/dashboard/attendance');
                  }}
                  className="px-4 py-2 bg-accent text-white hover:bg-accent-hover text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <span>Go to Attendance</span>
                  <ChevronRight size={12} />
                </button>
              )}

              {(selectedAlert.type === 'ASSIGNMENT' || selectedAlert.type === 'GRADING' || selectedAlert.type === 'COURSE') && (
                <button
                  onClick={() => {
                    setSelectedAlert(null);
                    router.push('/dashboard/courses');
                  }}
                  className="px-4 py-2 bg-accent text-white hover:bg-accent-hover text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <span>Go to Courses</span>
                  <ChevronRight size={12} />
                </button>
              )}

              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 bg-white border border-border hover:bg-slate-100 text-xs font-bold text-text-primary rounded-xl transition-all"
              >
                Dismiss Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
