'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, Mail, Lock, ArrowRight, Loader2, 
  Sparkles, ShieldCheck, Eye, EyeOff, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/Providers';

export default function LoginPage() {
  const router = useRouter();
  const { login, switchRole, availableTenants, activeTenant, switchTenant } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(formData.email, formData.password);
    setLoading(false);
    if (result?.success) {
      router.push('/dashboard');
    }
  };

  const handleDevLogin = (role) => {
    switchRole(role);
    toast.success(`Dev session configured as: ${role}`);
    setIsDemoOpen(false);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] font-inter text-slate-800 p-6 relative">
      
      {/* Central Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/10">
            <Shield size={24} />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black font-outfit text-slate-900 tracking-tight">Sign in to Nexus ERP</h2>
            <p className="text-xs text-slate-500 font-medium">Enter your credentials to access your workspace</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
              <input 
                type="email" 
                required
                placeholder="name@domain.edu"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-bg-sidebar border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1 text-[10px] font-black uppercase tracking-widest">
              <label className="text-slate-500">Password</label>
              <button type="button" className="text-blue-600 hover:text-blue-700 transition-colors">Forgot?</button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-bg-sidebar border border-slate-200 rounded-xl py-3.5 pl-12 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-500 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer controls & subtle demo switch anchor */}
        <div className="flex flex-col items-center justify-center gap-2 pt-2 border-t border-slate-100">
          <p className="text-[10px] text-slate-500 font-medium">Secured by Enterprise SSL Encryption</p>
          <button 
            type="button"
            onClick={() => setIsDemoOpen(true)}
            className="text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-all mt-1"
          >
            Access Demo Accounts
          </button>
        </div>

      </div>

      {/* Hidden Side Drawer for Demo Switcher (Developer Portal) */}
      {isDemoOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Overlay */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDemoOpen(false)}></div>
          
          {/* Drawer panel */}
          <div className="relative w-80 max-w-full bg-bg-card shadow-sm text-text-primary h-full p-6 shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-300 border-l border-border">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2 text-blue-500">
                  <Sparkles size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider font-outfit">Demo Accounts</h3>
                </div>
                <button onClick={() => setIsDemoOpen(false)} className="text-text-secondary hover:text-text-primary p-1 hover:bg-slate-100 rounded-lg transition-all">
                  <X size={16} />
                </button>
              </div>

              {/* Campus selector inside drawer */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Active Campus Target</label>
                <select 
                  value={activeTenant.id}
                  onChange={(e) => switchTenant(e.target.value)}
                  className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary outline-none cursor-pointer"
                >
                  {availableTenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Roles selection */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Login Profile Perspective</label>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                  {[
                    { role: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Global platform manager' },
                    { role: 'SCHOOL_ADMIN', label: 'School Admin', desc: 'Campus principal' },
                    { role: 'TEACHER', label: 'Teacher / Instructor', desc: 'Academics & grading' },
                    { role: 'STUDENT', label: 'Student Profile', desc: 'LMS portal & progress' },
                    { role: 'PARENT', label: 'Parent / Guardian', desc: 'Progress & fee logs' },
                    { role: 'ACCOUNTANT', label: 'Accountant / Bursar', desc: 'Collections & payroll' },
                    { role: 'LIBRARIAN', label: 'Librarian', desc: 'Catalog & loans' },
                    { role: 'TRANSPORT_MANAGER', label: 'Transport Head', desc: 'Fleets & routes' },
                    { role: 'HOSTEL_WARDEN', label: 'Hostel Warden', desc: 'Blocks & beds' }
                  ].map((item) => (
                    <button
                      key={item.role}
                      onClick={() => handleDevLogin(item.role)}
                      className="w-full p-3 bg-slate-100/50 hover:bg-blue-600/10 border border-border hover:border-blue-500/30 rounded-xl transition-all text-left group flex items-start gap-3"
                    >
                      <div className="p-1 bg-slate-100 rounded-lg text-text-secondary group-hover:text-blue-500 shrink-0"><ShieldCheck size={14} /></div>
                      <div>
                        <p className="text-xs font-bold text-text-primary group-hover:text-blue-400 transition-colors">{item.label}</p>
                        <span className="text-[9px] text-text-secondary block mt-0.5 leading-snug">{item.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-[9px] text-text-secondary leading-relaxed border-t border-border pt-4">
              Clicking a profile loads the matching credentials and configuration context into the session, granting instant access to the related dashboard.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
