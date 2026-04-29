import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', durationMs = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    if (durationMs > 0) {
      window.setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, durationMs);
    }
  }, []);

  const value = useMemo(() => ({ toasts, showToast, dismiss }), [toasts, showToast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: ToastItem[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-auto pointer-events-none"
      aria-live="polite"
    >
      {toasts.map(t => (
        <ToastView key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastView: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const palette: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: 'from-green-600/90 to-emerald-700/90', border: 'border-green-500/40', icon: '✓' },
    error: { bg: 'from-red-600/90 to-rose-700/90', border: 'border-red-500/40', icon: '⚠' },
    info: { bg: 'from-indigo-600/90 to-purple-700/90', border: 'border-indigo-500/40', icon: 'ℹ' },
  };
  const { bg, border, icon } = palette[toast.type];

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto bg-gradient-to-r ${bg} backdrop-blur-md border ${border} text-white rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 animate-fade-in-up`}
    >
      <span className="text-lg flex-shrink-0 leading-none mt-0.5" aria-hidden="true">{icon}</span>
      <p className="flex-1 text-sm whitespace-pre-line break-words">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Đóng thông báo"
        className="text-white/70 hover:text-white text-lg leading-none flex-shrink-0"
      >
        &times;
      </button>
    </div>
  );
};

interface UseToastReturn {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export const useToast = (): UseToastReturn => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải được dùng bên trong <ToastProvider>');
  const { showToast } = ctx;
  return useMemo(() => ({
    success: (m: string) => showToast(m, 'success'),
    error: (m: string) => showToast(m, 'error', 6000),
    info: (m: string) => showToast(m, 'info'),
  }), [showToast]);
};

export default ToastProvider;
