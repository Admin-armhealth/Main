'use client';

import Link from 'next/link';
import { ShieldCheck, Zap, BarChart3, CheckCircle, ArrowRight, Lock, FileText } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="ARM Health" className="h-10 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
              Sign In
            </Link>
            <Link href="/signup" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-sm shadow-blue-500/20">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="flex w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
              Now in Public Beta
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
              The Prior Authorization AI <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">You Can Use — Without HIPAA Risk</span>
            </h1>
            <p className="text-xl text-slate-600 mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              Pre-audit clinical notes, catch missing insurer requirements, and generate appeal letters — without storing or transmitting patient data.
            </p>
            <p className="text-sm font-medium text-slate-500 mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 bg-slate-50 inline-block px-4 py-2 rounded-lg border border-slate-100">
              🔒 All PHI is redacted in your browser. We never store patient identifiers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-200">
              <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 flex items-center justify-center">
                Start Free Audit <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              {/*
              <Link href="#demo" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition flex items-center justify-center">
                See How It Works
              </Link>
              */}
            </div>
          </div>
        </div>

        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl -z-10 mix-blend-multiply"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl -z-10 mix-blend-multiply"></div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Everything you need to get approved</h2>
            <p className="mt-4 text-slate-600">Replaces manual admin work with intelligent automation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 text-indigo-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI Denial Guard</h3>
              <p className="text-slate-600 leading-relaxed">
                Catch missing insurer requirements before submission. Our AI reviews your clinical notes against payer criteria (e.g., "Conservative therapy &gt; 6 weeks") so you submit once — not twice.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Instant, Insurer-Specific Appeals</h3>
              <p className="text-slate-600">
                Paste the denial reason and clinical notes. We generate a payer-specific appeal letter with citations — ready to submit in seconds, not hours.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Zero-Trust Privacy by Design</h3>
              <p className="text-slate-600">
                Patient identifiers are redacted before any processing. Only anonymized placeholders are used. Names and IDs are reinserted locally — never stored, never logged.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Who This Is For */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-medium mb-8">
            Built specifically for
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-4">
              <div className="font-bold text-lg text-slate-900 mb-2">Small & Mid-Size Practices</div>
              <p className="text-slate-500 text-sm">That can't afford compliance mistakes.</p>
            </div>
            <div className="p-4 border-l border-r border-slate-100">
              <div className="font-bold text-lg text-slate-900 mb-2">In-House Billing Teams</div>
              <p className="text-slate-500 text-sm">Facing overwhelmed staffing.</p>
            </div>
            <div className="p-4">
              <div className="font-bold text-lg text-slate-900 mb-2">Practice Managers</div>
              <p className="text-slate-500 text-sm">Handling prior auths and appeals manually.</p>
            </div>
          </div>
          <p className="mt-10 text-slate-400 text-sm">Not an EHR. Not a billing system. Just a safety layer before submission.</p>
        </div>
      </section>

      {/* Social Proof / Security */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-12">Privacy & Compliance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Zero Data Retention</h3>
                <p className="text-sm text-slate-600">Patient names and identifiers never touch our servers. We store [REDACTED] placeholders.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center mb-4">
                  <Lock className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">End-to-End Encryption</h3>
                <p className="text-sm text-slate-600">Secure transmission from your browser to processing. All traffic is encrypted.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Reduced Compliance Burden</h3>
                <p className="text-sm text-slate-600">Because we never possess PHI, your risk exposure is minimized.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <img src="/logo-white.svg" alt="ARM Health" className="h-8 w-auto" />
          </div>
          <div className="flex gap-8">
            <Link href="#" className="hover:text-white transition">Privacy</Link>
            <Link href="#" className="hover:text-white transition">Terms</Link>
            <Link href="#" className="hover:text-white transition">Contact</Link>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Secure SSL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
