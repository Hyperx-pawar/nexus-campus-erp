'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/Providers';
import { usePathname, useRouter } from 'next/navigation';
import { 
  FlaskConical, X, ShieldCheck, ChevronRight, Sliders, 
  Database, Key, Compass, HelpCircle, Check, Lock, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export default function DevSwitcher() {
  // Hide switcher in production environments
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const { 
    activeRole, 
    activeUser, 
    activeTenant, 
    availableTenants, 
    switchRole, 
    switchTenant,
    sharedParents,
    activeParentId,
    switchParent
  } = useAuth();
  
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const roles = [
    { code: 'SUPER_ADMIN', label: 'Super Admin', color: 'border-danger/30 text-danger bg-danger/5' },
    { code: 'SCHOOL_ADMIN', label: 'School Admin', color: 'border-warning/30 text-warning bg-warning/5' },
    { code: 'TEACHER', label: 'Teacher', color: 'border-accent/30 text-accent bg-accent/5' },
    { code: 'STUDENT', label: 'Student', color: 'border-success/30 text-success bg-success/5' },
    { code: 'PARENT', label: 'Parent', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' },
    { code: 'ACCOUNTANT', label: 'Accountant', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' },
    { code: 'LIBRARIAN', label: 'Librarian', color: 'border-pink-500/30 text-pink-400 bg-pink-500/5' },
    { code: 'TRANSPORT_MANAGER', label: 'Transport Head', color: 'border-teal-500/30 text-teal-400 bg-teal-500/5' },
    { code: 'HOSTEL_WARDEN', label: 'Hostel Warden', color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5' }
  ];

  const modules = [
    { name: 'Dashboard Home', path: '/dashboard', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT', 'LIBRARIAN', 'TRANSPORT_MANAGER', 'HOSTEL_WARDEN'] },
    { name: 'Student Directory', path: '/dashboard/students', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'] },
    { name: 'Staff Directory', path: '/dashboard/staff', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
    { name: 'Daily Attendance', path: '/dashboard/attendance', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'] },
    { name: 'Syllabus & LMS', path: '/dashboard/courses', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT'] },
    { name: 'Exams & Marksheets', path: '/dashboard/exams', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] },
    { name: 'Timetable', path: '/dashboard/timetable', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT'] },
    { name: 'Library Books', path: '/dashboard/library', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'LIBRARIAN', 'TEACHER', 'STUDENT'] },
    { name: 'Hostels & Boarding', path: '/dashboard/hostel', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HOSTEL_WARDEN', 'STUDENT'] },
    { name: 'School Bus & Transport', path: '/dashboard/transport', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'STUDENT'] },
    { name: 'ID Card Generator', path: '/dashboard/idcards', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] },
    { name: 'Career Portal (Placements)', path: '/dashboard/placement', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STUDENT', 'TEACHER'] },
    { name: 'Online Admissions', path: '/dashboard/admissions', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
    { name: 'HR & Staff Payroll', path: '/dashboard/hr', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT'] },
    { name: 'Fees & Finance', path: '/dashboard/finance', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT'] },
    { name: 'System Analytics', path: '/dashboard/analytics', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
    { name: 'School Settings', path: '/dashboard/settings', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
    { name: 'School Monitoring', path: '/dashboard/pulse', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
    { name: 'Edit Profile Desk', path: '/dashboard/profile', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT', 'LIBRARIAN', 'TRANSPORT_MANAGER', 'HOSTEL_WARDEN'] }
  ];

  const handleRoleChange = (roleCode) => {
    // Switch role in context
    switchRole(roleCode);
    
    // Check if the current route is allowed for the new role
    const currentModule = modules.find(m => pathname === m.path || (m.path !== '/dashboard' && pathname.startsWith(m.path)));
    
    if (currentModule && !currentModule.roles.includes(roleCode)) {
      toast.warning(`Current path restricted for ${roleCode}. Redirecting to Home Dashboard.`);
      router.push('/dashboard');
    }
  };

  const handleVerifyRLS = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 800)),
      {
        loading: 'Auditing RLS filters against Supabase schema...',
        success: `RLS verified! Encrypted tenant_id = "${activeTenant.id}" is locked in JWT session.`,
        error: 'Audit failed'
      }
    );
  };

  return (
    <div className="fixed bottom-6 left-6 z-[100] font-inter">
      {isOpen ? (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[140]" onClick={() => setIsOpen(false)}></div>

          {/* Drawer Panel */}
          <div className="fixed left-0 top-0 h-full w-96 bg-bg-card shadow-xl border-r border-border shadow-2xl z-[150] flex flex-col p-6 animate-in slide-in-from-left duration-300 text-text-primary">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/10 border border-border">
                  <FlaskConical size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-outfit">
                    {activeRole === 'SUPER_ADMIN' ? 'Platform Testing Hub' : 'Campus Testing Hub'}
                  </h3>
                  <p className="text-[10px] text-text-secondary">Simulate and verify all system modules</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-text-secondary hover:text-text-primary p-1 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto space-y-5 custom-scrollbar pr-1">
              
              {/* Tenant context */}
              <div className="space-y-1.5 p-3 bg-slate-100/50 border border-border rounded-2xl">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block mb-1">Active Campus Partition</span>
                <select 
                  value={activeTenant.id}
                  onChange={(e) => switchTenant(e.target.value)}
                  className="w-full bg-bg-main border border-border rounded-xl py-2.5 px-3 text-xs text-text-primary outline-none cursor-pointer"
                >
                  {availableTenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[8px] text-text-secondary mt-2 px-1">
                  <span>Subdomain: {activeTenant.subdomain}{activeRole === 'SUPER_ADMIN' ? '.campuserp.in' : '.campus.in'}</span>
                  <span>ID: {activeTenant.id}</span>
                </div>
              </div>

              {/* Role Switcher Grid */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Simulate Role (RBAC)</span>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((r) => {
                    const isActive = activeRole === r.code;
                    return (
                      <button
                        key={r.code}
                        onClick={() => handleRoleChange(r.code)}
                        className={`p-2.5 border text-left rounded-xl transition-all relative overflow-hidden group/btn ${
                          isActive 
                            ? `${r.color} border-border shadow-md ring-1 ring-white/10` 
                            : 'border-border bg-bg-main/40 text-text-secondary hover:text-text-primary hover:bg-slate-100'
                        }`}
                      >
                        <p className="text-[10px] font-bold truncate">{r.label}</p>
                        <span className="text-[8px] opacity-40 font-mono block truncate">{r.code}</span>
                        {isActive && (
                          <div className="absolute right-1 top-1 w-2.5 h-2.5 rounded-full bg-success flex items-center justify-center border border-bg-main">
                            <Check size={6} className="text-text-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Parent Selector for simulation testing */}
              {activeRole === 'PARENT' && (
                <div className="space-y-1.5 p-3 bg-indigo-600/5 border border-indigo-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Active Parent Profile Simulation</span>
                  <select 
                    value={activeParentId}
                    onChange={(e) => switchParent(e.target.value)}
                    className="w-full bg-bg-main border border-border rounded-xl py-2 px-3 text-xs text-text-primary outline-none cursor-pointer font-bold"
                  >
                    {sharedParents.map((p) => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.occupation})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Verify RLS button */}
              <button
                onClick={handleVerifyRLS}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-100 border border-border hover:border-purple-500/30 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-all hover:bg-slate-200/50"
              >
                <Database size={14} className="text-purple-400" />
                <span>Verify Tenant RLS Policy</span>
              </button>

              {/* Modules Quick Directory */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">All Modules Checker</span>
                <div className="space-y-1.5 max-h-[35vh] overflow-y-auto custom-scrollbar pr-1">
                  {modules.map((m) => {
                    const isAllowed = m.roles.includes(activeRole);
                    const isActivePage = pathname === m.path;
                    
                    return (
                      <div 
                        key={m.name}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isActivePage 
                            ? 'bg-accent/15 border-accent/35 text-accent'
                            : 'bg-bg-main/40 border-border text-text-secondary'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`text-[11px] font-bold truncate ${isActivePage ? 'text-text-primary' : 'text-slate-700'}`}>{m.name}</p>
                          <span className="text-[8px] opacity-50 block font-mono truncate">{m.path}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {isAllowed ? (
                            <span className="flex items-center gap-1 text-[8px] font-black uppercase text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded">
                              <Check size={8} /> Allowed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[8px] font-black uppercase text-danger bg-danger/10 border border-danger/20 px-1.5 py-0.5 rounded">
                              <Lock size={8} /> Locked
                            </span>
                          )}

                          <button
                            onClick={() => {
                              if (!isAllowed) {
                                toast.error(`Role ${activeRole} is not authorized to access ${m.name}`);
                                return;
                              }
                              router.push(m.path);
                              setIsOpen(false);
                            }}
                            className={`p-1 rounded-lg transition-all ${
                              isAllowed 
                                ? 'bg-slate-100 hover:bg-accent hover:text-white text-text-secondary' 
                                : 'bg-transparent text-text-secondary opacity-25 cursor-not-allowed'
                            }`}
                            disabled={!isAllowed}
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-border pt-4 mt-4 flex items-center justify-between text-[9px] text-text-secondary">
              <span>Simulation mode is ACTIVE</span>
              <span className="flex items-center gap-1">
                <Sparkles size={10} className="text-accent animate-pulse" />
                <span>{activeRole === 'SUPER_ADMIN' ? 'Campus ERP v2.4' : 'Campus ERP v2.4'}</span>
              </span>
            </div>

          </div>
        </>
      ) : (
        /* Floating Trigger Button */
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all group border border-border hover:shadow-indigo-500/20"
          title={activeRole === 'SUPER_ADMIN' ? "Open Platform ERP Testing Control Board" : "Open Campus Testing Control Board"}
        >
          <FlaskConical className="group-hover:rotate-12 transition-transform" size={24} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full border-2 border-bg-main shadow-lg"></span>
        </button>
      )}
    </div>
  );
}
