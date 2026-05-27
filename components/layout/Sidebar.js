'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  ClipboardList, 
  Wallet, 
  Library, 
  Home, 
  Bus, 
  Briefcase, 
  Bell, 
  FileBox, 
  Settings,
  ChevronRight,
  Shield,
  Sparkles,
  Zap,
  LogOut,
  MapPin,
  TrendingUp,
  Award,
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/components/Providers';

const sidebarLinks = [
  { 
    group: 'Institutional', 
    links: [
      { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT', 'LIBRARIAN', 'TRANSPORT_MANAGER', 'HOSTEL_WARDEN'] },
      { name: 'School Monitoring', icon: Zap, href: '/dashboard/pulse', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
    ]
  },
  { 
    group: 'Academics', 
    links: [
      { name: 'Student Directory', icon: Users, href: '/dashboard/students', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'] },
      { name: 'Staff Directory', icon: UserSquare2, href: '/dashboard/staff', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
      { name: 'Daily Attendance', icon: CheckCircle, href: '/dashboard/attendance', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'] },
      { name: 'Syllabus & LMS', icon: BookOpen, href: '/dashboard/courses', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT'] },
      { name: 'Classes & Subjects', icon: BookOpen, href: '/dashboard/courses?tab=classes', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
      { name: 'Exams & Marksheets', icon: ClipboardList, href: '/dashboard/exams', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] },
      { name: 'Timetable', icon: Calendar, href: '/dashboard/timetable', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT'] },
    ]
  },
  { 
    group: 'Operations', 
    links: [
      { name: 'Library Books', icon: Library, href: '/dashboard/library', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'LIBRARIAN', 'TEACHER', 'STUDENT'] },
      { name: 'Hostels & Boarding', icon: Home, href: '/dashboard/hostel', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HOSTEL_WARDEN', 'STUDENT'] },
      { name: 'School Bus & Transport', icon: Bus, href: '/dashboard/transport', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'STUDENT'] },
      { name: 'ID Card Generator', icon: CreditCard, href: '/dashboard/idcards', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'] },
      { name: 'Career Portal (Placements)', icon: Briefcase, href: '/dashboard/placement', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STUDENT', 'TEACHER'] },
      { name: 'Online Admissions', icon: Award, href: '/dashboard/admissions', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
    ]
  },
  { 
    group: 'Management', 
    links: [
      { name: 'HR & Staff Payroll', icon: FileBox, href: '/dashboard/hr', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT'] },
      { name: 'Fees & Finance', icon: Wallet, href: '/dashboard/finance', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT'] },
      { name: 'System Analytics', icon: TrendingUp, href: '/dashboard/analytics', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
      { name: 'School Settings', icon: Settings, href: '/dashboard/settings', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { activeRole, activeUser, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredLinks = sidebarLinks.map(group => ({
    ...group,
    links: group.links.filter(link => link.roles.includes(activeRole))
  })).filter(group => group.links.length > 0);

  return (
    <aside className={`relative z-[60] bg-bg-sidebar border-r border-border h-screen flex flex-col transition-all duration-300 ease-in-out font-inter ${isCollapsed ? 'w-[88px]' : 'w-[280px]'}`}>
      
      {/* Sidebar Header */}
      <div className="h-20 flex items-center px-6 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center shadow-lg shadow-accent/20 border border-border shrink-0">
             <Shield size={20} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
               <span className="font-outfit text-xl font-black text-text-primary tracking-tighter leading-none">NEXUS</span>
               <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mt-0.5">Management</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 space-y-6 custom-scrollbar">
        {filteredLinks.map((group, i) => (
          <div key={i} className="space-y-2">
            {!isCollapsed && (
              <h3 className="px-4 text-[9px] font-black text-text-secondary uppercase tracking-[0.25em] mb-3 opacity-40">
                {group.group}
              </h3>
            )}
            <div className="space-y-1">
              {group.links.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative ${
                      isActive 
                        ? 'bg-accent/10 text-accent border border-accent/20' 
                        : 'text-text-secondary hover:bg-slate-100 hover:text-text-primary border border-transparent'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-[-16px] w-1.5 h-6 bg-accent rounded-r-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                    )}
                    <Icon size={18} className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`} />
                    {!isCollapsed && (
                      <span className={`text-sm font-semibold transition-all duration-300 ${isActive ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>
                        {link.name}
                      </span>
                    )}
                    {isActive && !isCollapsed && <ChevronRight size={12} className="ml-auto opacity-40 text-accent" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Footer (User Info & Logout) */}
      <div className="p-4 mt-auto border-t border-border bg-slate-50/50">
        <div className={`p-1 rounded-[2rem] bg-indigo-500/10 border border-border backdrop-blur-md relative overflow-hidden group/profile ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/[0.05] to-accent/0 translate-x-[-100%] group-hover/profile:translate-x-[100%] transition-transform duration-1000"></div>
          
          <div className="flex items-center gap-2.5 p-2.5 relative z-10">
            <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/20 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
               <span className="font-black text-accent text-xs uppercase">
                 {activeUser?.name?.[0] || 'U'}
               </span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[12px] font-bold text-text-primary truncate">{activeUser?.name || 'Academic User'}</span>
                <div className="flex items-center gap-1 mt-0.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
                   <span className="text-[9px] text-text-secondary font-black uppercase tracking-widest">{activeRole}</span>
                </div>
              </div>
            )}
            {!isCollapsed && (
               <button 
                 onClick={logout}
                 className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
               >
                 <LogOut size={14} />
               </button>
            )}
          </div>
        </div>

        {/* Collapse Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full mt-3 flex items-center justify-center p-1.5 text-text-secondary hover:text-text-primary transition-all opacity-40 hover:opacity-100"
        >
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
             {isCollapsed ? <ChevronRight size={14} /> : 'Collapse Terminal'}
          </div>
        </button>
      </div>
    </aside>
  );
}
