'use client';

import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RoleGate({ allowedRoles, activeRole, moduleName }) {
  const router = useRouter();

  if (allowedRoles.includes(activeRole)) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-6 font-inter animate-slide-up">
      <div className="w-full max-w-lg bg-bg-card border border-border rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden text-center space-y-6">
        <div className="absolute inset-0 bg-gradient-to-br from-danger/5 via-transparent to-transparent z-0"></div>
        
        {/* Pulsing Alert Icon */}
        <div className="relative z-10 mx-auto w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger animate-pulse">
          <ShieldAlert size={32} />
        </div>

        {/* Text Details */}
        <div className="relative z-10 space-y-2">
          <h2 className="text-2xl font-black font-outfit text-text-primary tracking-tight">Access Restricted</h2>
          <p className="text-xs font-bold text-danger uppercase tracking-widest">Authorization Failed</p>
          <p className="text-xs text-text-secondary leading-relaxed max-w-sm mx-auto mt-2">
            Your current security role <span className="font-mono font-bold text-text-primary bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{activeRole}</span> is not authorized to access the <span className="font-bold text-text-primary">{moduleName}</span> module.
          </p>
        </div>

        {/* Actions */}
        <div className="relative z-10 flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => router.back()}
            className="px-5 py-3 bg-bg-sidebar border border-border hover:border-slate-300 text-text-primary text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/15 active:scale-95"
          >
            <Home size={14} />
            <span>Home Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
