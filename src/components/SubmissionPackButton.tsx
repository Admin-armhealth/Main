'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';

interface SubmissionPackButtonProps {
    requestId: string;
    patientName?: string;
}

export function SubmissionPackButton({ requestId, patientName }: SubmissionPackButtonProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const response = await fetch('/api/export/pack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId })
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Download the ZIP
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `arm_submission_${patientName?.replace(/\s+/g, '_') || 'patient'}_${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download submission pack. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center px-3 py-1.5 text-xs font-medium bg-blue-600 text-white border border-blue-700 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {isDownloading ? 'Preparing...' : 'Submission Pack'}
        </button>
    );
}
