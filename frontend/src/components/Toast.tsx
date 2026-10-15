import type { ToastState } from "../hooks/useToast";

export function Toast({ toast }: { toast: ToastState }) {
  return (
    <div className={`toast${toast.on ? " on" : ""}${toast.err ? " err" : ""}`} role="status" aria-live="polite">
      {toast.msg}
    </div>
  );
}
