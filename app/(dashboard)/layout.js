import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Chatbot from '@/components/AI/Chatbot';
import DevSwitcher from '@/components/AI/DevSwitcher';
import PWAInstallModal from '@/components/layout/PWAInstallModal';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8 fade-in">
            {children}
          </div>
        </main>
      </div>
      <Chatbot />
      <DevSwitcher />
      <PWAInstallModal />
    </div>
  );
}

