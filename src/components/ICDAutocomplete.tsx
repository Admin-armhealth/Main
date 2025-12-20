
import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Info } from 'lucide-react';

interface ICDCode {
    code: string;
    description: string;
}

interface ICDAutocompleteProps {
    onSelect: (code: ICDCode) => void;
    placeholder?: string;
}

export function ICDAutocomplete({ onSelect, placeholder = "Type to search ICD-10 codes..." }: ICDAutocompleteProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ICDCode[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                try {
                    const res = await fetch(`/api/search/icd?q=${encodeURIComponent(query)}`);
                    if (res.ok) {
                        const data = await res.json();
                        setResults(data.results || []);
                        setShowDropdown(true);
                    }
                } catch (e) {
                    console.error("Search error", e);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
                setShowDropdown(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [query]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    onFocus={() => {
                        if (results.length > 0) setShowDropdown(true);
                    }}
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    {loading ? (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : (
                        <Search className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </div>

            {/* Dropdown Results */}
            {showDropdown && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    {results.map((item) => (
                        <div
                            key={item.code}
                            onClick={() => {
                                onSelect(item);
                                setQuery(''); // Clear search on select to allow next input
                                setShowDropdown(false);
                            }}
                            className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-none group"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-2">
                                    <span className="font-mono font-bold text-blue-600 text-sm bg-blue-50 px-1.5 py-0.5 rounded">{item.code}</span>

                                    {/* Common Codes Badge */}
                                    {['M23', 'M54', 'R51', 'M51', 'M17', 'M25', 'S83'].some(prefix => item.code.startsWith(prefix)) && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
                                            ⭐ Common
                                        </span>
                                    )}

                                    {/* Laterality Badges */}
                                    {item.description.toLowerCase().includes('left') && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-tighter">
                                            LEFT
                                        </span>
                                    )}
                                    {item.description.toLowerCase().includes('right') && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-tighter">
                                            RIGHT
                                        </span>
                                    )}
                                    {item.description.toLowerCase().includes('bilateral') && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-700 uppercase tracking-tighter">
                                            BILATERAL
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 group-hover:text-slate-900 line-clamp-2">{item.description}</p>
                        </div>
                    ))}
                </div>
            )}

            {showDropdown && !loading && results.length === 0 && query.length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-center">
                    <p className="text-xs text-slate-400 flex items-center justify-center">
                        <Info className="w-3 h-3 mr-1" /> No codes found. Try a different keyword.
                    </p>
                </div>
            )}
        </div>
    );
}
