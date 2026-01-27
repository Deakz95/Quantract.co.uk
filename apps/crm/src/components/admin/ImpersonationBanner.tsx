// app/components/admin/ImpersonationBanner.tsx
'use client';

import { useImpersonation } from '@/hooks/useImpersonation';
import { AlertTriangle, X, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ImpersonationBanner() {
  const { status, loading, stopImpersonation } = useImpersonation();
  const [duration, setDuration] = useState('');

  // Calculate duration since impersonation started
  useEffect(() => {
    if (!status?.isImpersonating || !status?.startedAt) return;

    const updateDuration = () => {
      const start = new Date(status.startedAt || new Date());
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        setDuration('just now');
      } else if (diffMins === 1) {
        setDuration('1 minute');
      } else if (diffMins < 60) {
        setDuration(`${diffMins} minutes`);
      } else {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        setDuration(`${hours}h ${mins}m`);
      }
    };

    updateDuration();
    const interval = setInterval(updateDuration, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [status]);

  // ESC key to exit
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status?.isImpersonating) {
        handleStop();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [status]);

  if (loading || !status) {
    return null;
  }

  if (!status.isImpersonating) {
    return null;
  }

  const handleStop = async () => {
    if (confirm('Are you sure you want to stop impersonating this user?')) {
      try {
        await stopImpersonation();
      } catch (error) {
        alert('Failed to stop impersonation. Please try again.');
      }
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(245, 158, 11, 0.8);
          }
        }
        .pulse-border {
          animation: pulse-glow 3s ease-in-out infinite;
        }
      `}</style>
      
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-2xl pulse-border">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <Users className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-5 w-5 animate-pulse" />
                  <span className="font-bold text-lg">?? Impersonation Mode Active</span>
                </div>
                <p className="text-base text-white/95">
                  Currently viewing as:{' '}
                  <span className="font-bold">
                    {status.impersonatingUser?.name}
                  </span>{' '}
                  <span className="text-white/80">
                    ({status.impersonatingUser?.role})
                  </span>
                </p>
                {duration && (
                  <p className="text-sm text-white/80 mt-1">
                    Active for {duration}
                  </p>
                )}
              </div>
            </div>
            
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 font-semibold border-2 border-white/40 hover:border-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500"
              title="Exit Impersonation (ESC)"
              aria-label="Exit Impersonation mode (Press Escape)"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Exit Impersonation</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

