import { useCallback, useRef, useState } from "react";

export interface ToastState {
  msg: string;
  err: boolean;
  on: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ msg: "", err: false, on: false });
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((msg: string, err = false) => {
    setToast({ msg, err, on: true });
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(t => ({ ...t, on: false })), err ? 3600 : 2200);
  }, []);
  return { toast, show };
}
