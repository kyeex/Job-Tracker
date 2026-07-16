"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 2_400;

export function useToast() {
  const [toast, setToast] = useState("");
  const dismissTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (dismissTimer.current !== null) {
      window.clearTimeout(dismissTimer.current);
    }
  }, []);

  const showToast = useCallback((message: string) => {
    if (dismissTimer.current !== null) {
      window.clearTimeout(dismissTimer.current);
    }

    setToast(message);
    dismissTimer.current = window.setTimeout(() => {
      dismissTimer.current = null;
      setToast("");
    }, TOAST_DURATION_MS);
  }, []);

  return { toast, showToast };
}
