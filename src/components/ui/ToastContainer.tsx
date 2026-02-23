"use client";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Toast, ToastType } from "@/hooks/use-toast";

const STYLES: Record<
  ToastType,
  { bg: string; text: string; icon: React.FC<{ className?: string }> }
> = {
  success: {
    bg: "bg-[#1F1C18] border-[#D4AF6A]",
    text: "text-[#D4AF6A]",
    icon: CheckCircle,
  },
  error: {
    bg: "bg-[#1F1C18] border-[#8E0E00]",
    text: "text-[#FF8070]",
    icon: AlertCircle,
  },
  warning: {
    bg: "bg-[#1F1C18] border-[#C8A061]",
    text: "text-[#C8A061]",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-[#1F1C18] border-[#182E5F]",
    text: "text-[#8FA8D8]",
    icon: Info,
  },
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const s = STYLES[toast.type];
  const Icon = s.icon;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg",
        "animate-in slide-in-from-right-5 fade-in duration-300",
        s.bg,
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.text)} />
      <p className="flex-1 text-sm text-[#E6E6E6]">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-[#706050] transition-colors hover:text-[#E6E6E6]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (!toasts.length) return null;
  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
