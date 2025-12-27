'use client';

import { useState, createContext, useContext, ReactNode, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
    title?: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextType {
    showToast: (message: string, type: Toast['type'], title?: string) => void;
    showError: (message: string) => void;
    showSuccess: (message: string) => void;
    showRateLimitError: () => void;
    showTimeoutError: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: Toast['type'], title?: string) => {
        const id = Math.random().toString(36);
        setToasts(prev => [...prev, { id, message, type, title }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000); // Increased to 5 seconds for better readability
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Convenience methods for common error types
    const showError = useCallback((message: string) => {
        showToast(message, 'error', 'Error');
    }, [showToast]);

    const showSuccess = useCallback((message: string) => {
        showToast(message, 'success', 'Success');
    }, [showToast]);

    const showRateLimitError = useCallback(() => {
        showToast(
            'You\'ve made too many requests. Please wait a minute before trying again.',
            'warning',
            'Rate Limit Exceeded'
        );
    }, [showToast]);

    const showTimeoutError = useCallback(() => {
        showToast(
            'The AI is taking longer than expected. Please try again.',
            'error',
            'Request Timeout'
        );
    }, [showToast]);

    const getIcon = (type: Toast['type']) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-5 h-5" />;
            case 'error':
                return <AlertCircle className="w-5 h-5" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5" />;
            case 'info':
            default:
                return <Info className="w-5 h-5" />;
        }
    };

    const getStyles = (type: Toast['type']) => {
        switch (type) {
            case 'success':
                return 'bg-emerald-50 border-emerald-200 text-emerald-800';
            case 'error':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'warning':
                return 'bg-amber-50 border-amber-200 text-amber-800';
            case 'info':
            default:
                return 'bg-blue-50 border-blue-200 text-blue-800';
        }
    };

    const getIconStyles = (type: Toast['type']) => {
        switch (type) {
            case 'success':
                return 'text-emerald-500';
            case 'error':
                return 'text-red-500';
            case 'warning':
                return 'text-amber-500';
            case 'info':
            default:
                return 'text-blue-500';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, showError, showSuccess, showRateLimitError, showTimeoutError }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border
                            backdrop-blur-sm
                            animate-in slide-in-from-right-5 fade-in duration-300
                            ${getStyles(toast.type)}
                        `}
                    >
                        <span className={`flex-shrink-0 mt-0.5 ${getIconStyles(toast.type)}`}>
                            {getIcon(toast.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                            {toast.title && (
                                <p className="font-semibold text-sm">{toast.title}</p>
                            )}
                            <p className="text-sm opacity-90">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => dismissToast(toast.id)}
                            className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}
