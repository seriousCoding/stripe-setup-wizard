
import { useState, useCallback } from 'react';

export interface ToastConfig {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

export interface Toast extends ToastConfig {
  id: string;
}

let toastCounter = 0;

export const useCustomToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((config: ToastConfig) => {
    const id = `toast-${++toastCounter}`;
    const toast: Toast = {
      id,
      ...config,
    };

    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toast = useCallback((config: ToastConfig) => {
    return addToast(config);
  }, [addToast]);

  return {
    toasts,
    toast,
    removeToast,
  };
};
