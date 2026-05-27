'use client';

import React from 'react';
import { useAuth } from '@/components/Providers';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import SchoolAdminDashboard from '@/components/dashboards/SchoolAdminDashboard';
import RoleDashboardDispatcher from '@/components/dashboards/RoleDashboardDispatcher';
import { Sparkles, HelpCircle } from 'lucide-react';

export default function DashboardPage() {
  const { activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-text-secondary font-bold uppercase tracking-wider">Syncing Environmental Context...</span>
        </div>
      </div>
    );
  }

  // Render correct dashboard based on dynamic role context
  if (activeRole === 'SUPER_ADMIN') {
    return <SuperAdminDashboard />;
  }

  if (activeRole === 'SCHOOL_ADMIN') {
    return <SchoolAdminDashboard />;
  }

  // Fallback to dispatcher for all other roles
  return <RoleDashboardDispatcher role={activeRole} />;
}
