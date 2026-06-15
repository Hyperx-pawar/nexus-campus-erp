'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { useAuth } from '@/components/Providers';
import { 
  Smartphone, 
  Share, 
  PlusSquare, 
  ArrowDownToLine, 
  Laptop, 
  Globe, 
  CheckCircle2 
} from 'lucide-react';

export default function PWAInstallModal() {
  const { showInstallModal, setShowInstallModal, handleInstallApp } = useAuth();
  const [deviceType, setDeviceType] = useState('android'); // 'ios' | 'android' | 'desktop'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      
      // Detect iOS
      if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        setDeviceType('ios');
      } 
      // Detect Desktop
      else if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        setDeviceType('desktop');
      } 
      // Default to Android
      else {
        setDeviceType('android');
      }
    }
  }, [showInstallModal]);

  return (
    <Modal
      open={showInstallModal}
      onClose={() => setShowInstallModal(false)}
      title="Install Campus ERP App"
      icon={<Smartphone className="text-accent" size={20} />}
      size="md"
    >
      <div className="space-y-6 font-inter text-text-primary p-1">
        {/* Banner */}
        <div className="bg-gradient-to-br from-accent/10 to-indigo-500/10 border border-accent/20 rounded-3xl p-5 text-center space-y-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-accent/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="w-12 h-12 rounded-2xl bg-white border border-border flex items-center justify-center mx-auto shadow-sm">
            <Smartphone className="text-accent" size={24} />
          </div>
          <h4 className="text-sm font-black text-text-primary">Get the App on Your Phone</h4>
          <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
            Install Campus ERP on your home screen for quick offline access, push notifications, and a premium mobile experience.
          </p>
        </div>

        {/* Dynamic instructions based on platform */}
        {deviceType === 'ios' ? (
          /* iOS Safari Guide */
          <div className="space-y-4">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block">iOS Safari Instructions</span>
            
            <div className="space-y-3">
              <div className="flex gap-3.5 items-start bg-slate-50/50 border border-border p-3.5 rounded-2xl">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent text-[11px] font-black text-white shrink-0">1</span>
                <div className="space-y-1">
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    Tap the Share Button <Share size={14} className="text-accent" />
                  </p>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Open Safari's share menu at the bottom of the screen (on iPhone) or the top (on iPad).
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start bg-slate-50/50 border border-border p-3.5 rounded-2xl">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent text-[11px] font-black text-white shrink-0">2</span>
                <div className="space-y-1">
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    Select "Add to Home Screen" <PlusSquare size={14} className="text-accent" />
                  </p>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Scroll down the sharing option list and tap on the **"Add to Home Screen"** action.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start bg-slate-50/50 border border-border p-3.5 rounded-2xl">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent text-[11px] font-black text-white shrink-0">3</span>
                <div className="space-y-1">
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    Tap "Add" <CheckCircle2 size={14} className="text-success" />
                  </p>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Tap the **"Add"** button in the top-right corner. The app icon will appear on your device's home screen!
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Android / Chrome Desktop Guide */
          <div className="space-y-4">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block">
              {deviceType === 'desktop' ? 'Desktop App Installation' : 'Android App Installation'}
            </span>

            <div className="space-y-4">
              <button
                onClick={handleInstallApp}
                className="w-full py-3.5 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-2xl transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2 active:scale-98"
              >
                <ArrowDownToLine size={16} />
                <span>Install App Now</span>
              </button>

              <div className="h-px bg-slate-100 my-4" />

              <div className="space-y-2">
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Manual Alternative</p>
                <div className="flex gap-3 items-start p-3 bg-slate-50/50 rounded-2xl border border-border">
                  {deviceType === 'desktop' ? <Laptop size={16} className="text-slate-400 mt-0.5" /> : <Globe size={16} className="text-slate-400 mt-0.5" />}
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-text-primary">Install via browser options</p>
                    <p className="text-[10px] text-text-secondary leading-relaxed">
                      Tap your browser's options menu (three dots icon in top-right) and select **"Install App"** or **"Add to Home Screen"**.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Close */}
        <button
          onClick={() => setShowInstallModal(false)}
          className="w-full py-3.5 bg-slate-100 hover:bg-slate-200/60 border border-border text-text-primary text-xs font-bold rounded-2xl transition-all active:scale-98"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
