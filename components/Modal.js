'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Reusable fullscreen overlay modal with glass backdrop.
 * Renders via React Portal directly into document.body to prevent layout/parent overflow issues.
 * 
 * @param {boolean} open - Whether the modal is visible
 * @param {function} onClose - Handler to close the modal
 * @param {string} title - Modal header title
 * @param {React.ReactNode} icon - Optional icon element beside title
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 * @param {React.ReactNode} children - Modal body content
 */
export default function Modal({ open, onClose, title, icon, size = 'md', children }) {
  const overlayRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !mounted) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div 
        className={`bg-bg-card border border-border rounded-[2rem] w-full ${sizeClasses[size] || sizeClasses.md} overflow-hidden relative shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-accent">{icon}</span>}
            <h3 className="text-sm font-black uppercase tracking-wider font-outfit text-text-primary">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-text-secondary hover:text-text-primary transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
