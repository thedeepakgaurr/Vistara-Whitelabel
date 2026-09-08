'use client';

import { createContext, useCallback, useContext, useSyncExternalStore, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastType = 'success' | 'error';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<{ push: (type: ToastType, message: string) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return {
    success: (message: string) => ctx.push('success', message),
    error: (message: string) => ctx.push('error', message),
  };
}

const emptySubscribe = () => () => {};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Portals must not render during SSR/hydration (no `document` on the
  // server) — useSyncExternalStore provides safe client-side mounted detection.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'fade-in flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm shadow-lg',
                  t.type === 'success' ? 'border-success/20 bg-surface text-foreground' : 'border-danger/20 bg-surface text-foreground'
                )}
              >
                {t.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />
                )}
                <span className="flex-1">{t.message}</span>
                <button
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
