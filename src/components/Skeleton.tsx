'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    lines?: number;
}

/**
 * Skeleton loader component for content placeholders
 */
export function Skeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
    lines = 1
}: SkeletonProps) {
    const baseClasses = 'animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]';

    const variantClasses = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg'
    };

    const style: React.CSSProperties = {
        width: width || '100%',
        height: height || (variant === 'text' ? '1rem' : '100%'),
        animation: 'shimmer 1.5s ease-in-out infinite'
    };

    if (lines > 1 && variant === 'text') {
        return (
            <div className={`space-y-2 ${className}`}>
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={`${baseClasses} ${variantClasses[variant]}`}
                        style={{
                            ...style,
                            width: i === lines - 1 ? '80%' : '100%' // Last line shorter
                        }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
}

/**
 * Card skeleton for dashboard cards
 */
export function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="circular" width={40} height={40} />
            </div>
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="text" width="80%" />
        </div>
    );
}

/**
 * Table skeleton for data tables
 */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border-b">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} variant="text" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b last:border-0">
                    {[1, 2, 3, 4].map(j => (
                        <Skeleton key={j} variant="text" />
                    ))}
                </div>
            ))}
        </div>
    );
}

/**
 * Form skeleton for input forms
 */
export function SkeletonForm() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton variant="text" width={120} />
                <Skeleton variant="rectangular" height={40} />
            </div>
            <div className="space-y-2">
                <Skeleton variant="text" width={100} />
                <Skeleton variant="rectangular" height={120} />
            </div>
            <div className="flex gap-4">
                <Skeleton variant="rectangular" width={100} height={40} />
                <Skeleton variant="rectangular" width={100} height={40} />
            </div>
        </div>
    );
}
