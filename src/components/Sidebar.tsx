'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, ShieldAlert, LayoutDashboard, Settings, History, BookOpen } from 'lucide-react';

export function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'New Pre-Auth', href: '/preauth', icon: FileText },
        { name: 'New Appeal', href: '/appeal', icon: ShieldAlert },
        { name: 'Auto-Fill Forms', href: '/forms', icon: FileText },
        { name: 'Policies (Brain)', href: '/admin/policies', icon: BookOpen },
        { name: 'History', href: '/history', icon: History },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen fixed left-0 top-0 flex flex-col text-white shadow-xl">
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-xl font-bold flex items-center tracking-tight">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-500/20">
                        <span className="text-white font-bold text-lg">A</span>
                    </div>
                    <span className="text-blue-100">ARM</span>
                </h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-blue-600/20 text-blue-400 shadow-inner'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="mt-4 px-4 text-xs text-slate-600 font-mono">
                    v0.1.0 • {process.env.NEXT_PUBLIC_APP_NAME || 'ARM'}
                </div>
                <button
                    onClick={async () => {
                        const { supabase } = await import('@/lib/supabaseClient');
                        await supabase.auth.signOut();
                        window.location.href = '/login';
                    }}
                    className="mt-4 w-full text-left px-4 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}
