"use client";

import { useEffect, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// Simple global toast state (no context provider needed)
let globalShowToast: ((message: string, type?: ToastType) => void) | null = null;

export function useToast(): ToastContextValue {
  return {
    showToast: (message: string, type: ToastType = "info") => {
      globalShowToast?.(message, type);
    },
  };
}

const typeStyles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: "bg-[#00d2a0]/10",
    border: "border-[#00d2a0]/30",
    icon: (
      <svg className="h-4 w-4 text-[#00d2a0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    bg: "bg-[#ff4757]/10",
    border: "border-[#ff4757]/30",
    icon: (
      <svg className="h-4 w-4 text-[#ff4757]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  warning: {
    bg: "bg-[#ffc107]/10",
    border: "border-[#ffc107]/30",
    icon: (
      <svg className="h-4 w-4 text-[#ffc107]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  info: {
    bg: "bg-[#6c5ce7]/10",
    border: "border-[#6c5ce7]/30",
    icon: (
      <svg className="h-4 w-4 text-[#6c5ce7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  useEffect(() => {
    globalShowToast = showToast;
    return () => {
      globalShowToast = null;
    };
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed left-0 right-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const style = typeStyles[toast.type];

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm rounded-xl border ${style.border} ${style.bg} px-4 py-3 shadow-lg backdrop-blur-xl transition-all duration-300 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{style.icon}</div>
        <p className="text-sm text-[#f0f0f5]">{toast.message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onRemove(toast.id), 300);
          }}
          className="ml-auto shrink-0 text-[#55556a] transition-colors hover:text-[#8888a0]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
