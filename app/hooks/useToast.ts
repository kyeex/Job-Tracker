"use client";

import { useCallback, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState("");

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  return { toast, showToast };
}
