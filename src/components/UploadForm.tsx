
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCheck, CheckCircle, AlertCircle, FileType, X } from 'lucide-react';
import { ICDAutocomplete } from './ICDAutocomplete';

interface UploadFormProps {
    onConfirm: (text: string, codes: {
        cpt: string[];
        icd: string[];
        payer?: string;
        specialty?: string;
        tone?: string;
        patientRaw?: { name: string; id: string; dob: string };
        providerRaw?: { name: string; npi: string; tin: string; clinicName: string };
    }) => void;
    title: string;
    description: string;
    initialValues?: {
        text?: string;
        cpt?: string[];
        icd?: string[];
        payer?: string;
        specialty?: string;
        tone?: string;
        patientRaw?: { name: string; id: string; dob: string };
        providerRaw?: { name: string; npi: string; tin: string; clinicName: string };
    } | null;
}

export function UploadForm({ onConfirm, title, description, initialValues }: UploadFormProps) {
    const [extractedText, setExtractedText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual code inputs
    const [cptInput, setCptInput] = useState('');
    const [icdInput, setIcdInput] = useState('');
    const [selectedPayer, setSelectedPayer] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('');

    // Metadata Inputs
    const [patientName, setPatientName] = useState('');
    const [patientId, setPatientId] = useState('');
    const [patientDob, setPatientDob] = useState('');
    const [providerName, setProviderName] = useState('');
    const [providerClinicName, setProviderClinicName] = useState('');
    const [providerNpi, setProviderNpi] = useState('');
    const [providerTin, setProviderTin] = useState('');

    const payers = ['Aetna', 'Cigna', 'UnitedHealthcare', 'BCBS', 'Medicare', 'Other'];
    const specialties = ['General Practice', 'Cardiology', 'Orthopedics', 'Gastroenterology', 'Neurology', 'Dentistry'];
    const tones = ['Standard', 'Urgent', 'Academic', 'Persuasive', 'Friendly'];

    // State for auto-saved shortcuts
    const [savedShortcuts, setSavedShortcuts] = useState<Array<{ cpt: string; icd: string }>>([]);
    // State for auto-saved provider history
    const [savedProviders, setSavedProviders] = useState<Array<{ name: string; npi: string; tin: string; clinicName: string }>>([]);

    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [orgMembers, setOrgMembers] = useState<Array<{ id: string; name: string; npi: string }>>([]); // Store members
    const [selectedTone, setSelectedTone] = useState('Standard');

    // Load defaults from profile OR initialValues
    useEffect(() => {
        if (initialValues) {
            setExtractedText(initialValues.text || '');
            setCptInput(initialValues.cpt?.join(', ') || '');
            setIcdInput(initialValues.icd?.join(', ') || '');
            setSelectedPayer(initialValues.payer || '');
            setSelectedSpecialty(initialValues.specialty || '');
            setSelectedTone(initialValues.tone ? initialValues.tone.charAt(0).toUpperCase() + initialValues.tone.slice(1) : 'Standard');

            if (initialValues.patientRaw) {
                setPatientName(initialValues.patientRaw.name || '');
                setPatientId(initialValues.patientRaw.id || '');
                setPatientDob(initialValues.patientRaw.dob || '');
            }
            if (initialValues.providerRaw) {
                setProviderName(initialValues.providerRaw.name || '');
                setProviderNpi(initialValues.providerRaw.npi || '');
                setProviderTin(initialValues.providerRaw.tin || '');
                setProviderClinicName(initialValues.providerRaw.clinicName || '');
            }
            return; // Skip profile load if cloning
        }

        const loadProfile = async () => {
            const { supabase } = await import('@/lib/supabaseClient');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('full_name, npi, organization_id')
                .eq('id', user.id)
                .single();

            if (profile) {
                // REMOVED: Do not auto-fill Provider Name with User Name (per user request)
                // if (profile.full_name) setProviderName(profile.full_name);
                // if (profile.npi) setProviderNpi(profile.npi);

                if (profile.organization_id) {
                    setOrganizationId(profile.organization_id);

                    // Fetch Org Details
                    const { data: org } = await supabase
                        .from('organizations')
                        .select('name, npi, tin, saved_preferences')
                        .eq('id', profile.organization_id)
                        .single();

                    if (org) {
                        if (org.name) setProviderClinicName(org.name);
                        // Prefer individual NPI, fallback to group NPI
                        if (org.npi && !profile.npi) setProviderNpi(org.npi);
                        if (org.tin) setProviderTin(org.tin);

                        // Load saved shortcuts
                        if (org.saved_preferences && typeof org.saved_preferences === 'object') {
                            const prefs = org.saved_preferences as any;
                            if (Array.isArray(prefs.shortcuts)) {
                                setSavedShortcuts(prefs.shortcuts);
                            }
                            if (Array.isArray(prefs.providers)) {
                                setSavedProviders(prefs.providers);
                            }
                        }
                    }

                    // Fetch Team Members for Dropdown
                    const { data: members } = await supabase
                        .from('organization_members')
                        .select('user_id')
                        .eq('organization_id', profile.organization_id);

                    if (members && members.length > 0) {
                        const userIds = members.map(m => m.user_id);
                        const { data: profiles } = await supabase
                            .from('user_profiles')
                            .select('id, full_name, npi')
                            .in('id', userIds);

                        if (profiles) {
                            setOrgMembers(profiles.map(p => ({
                                id: p.id,
                                name: p.full_name || 'Unnamed Provider',
                                npi: p.npi || ''
                            })));
                        }
                    }
                }
            }
        };
        loadProfile();
    }, [initialValues]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const isImage = file.type.startsWith('image/');
            let extractedData = '';

            if (isImage) {
                // Client-side OCR to avoid server-side path issues
                console.log('Starting Client-Side OCR...');
                const { createWorker } = await import('tesseract.js');
                const worker = await createWorker('eng');
                const ret = await worker.recognize(file);
                extractedData = ret.data.text;
                await worker.terminate();
                console.log('OCR Complete');
            } else {
                // Server-side PDF Parsing
                const res = await fetch('/api/parse-pdf', {
                    method: 'POST',
                    body: formData,
                });

                if (!res.ok) throw new Error('Failed to process Document');
                const data = await res.json();
                extractedData = data.text;
                if (data.metadata) {
                    // Handle metadata if returned
                }
            }

            setExtractedText(extractedData);

            // Auto-fill form with AI based on extracted text
            const fillRes = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: extractedData }),
            });

            if (fillRes.ok) {
                const m = await fillRes.json();

                // -------------------------------------------------------------
                // 📸 SCANNED PDF FALLBACK (Client-Side OCR)
                // -------------------------------------------------------------
                if (m.requiresOCR) {
                    console.log('Scanned PDF detected. Switching to Client-Side OCR...');
                    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');

                    // Set worker (Important for Next.js)
                    if (!GlobalWorkerOptions.workerSrc) {
                        GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs`;
                    }

                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await getDocument({ data: arrayBuffer }).promise;

                    let fullOcrText = '';
                    const { createWorker } = await import('tesseract.js');
                    const worker = await createWorker('eng');

                    console.log(`Processing ${pdf.numPages} pages...`);

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 2.0 }); // High scale for better OCR

                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        if (context) {
                            // Correct property for pdfjs-dist
                            await page.render({ canvasContext: context, viewport }).promise;
                            const ret = await worker.recognize(canvas);
                            fullOcrText += ret.data.text + '\n\n';
                        }
                    }

                    await worker.terminate();
                    console.log('PDF OCR Complete.');

                    // Update the extracted text with OCR result
                    setExtractedText(fullOcrText); // Fix: Use setter
                    m.text = fullOcrText; // Update metadata object for auto-fill call below if needed

                    // RE-RUN Auto-Fill with the OCR Text
                    const retryRes = await fetch('/api/extract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: fullOcrText }),
                    });

                    if (retryRes.ok) {
                        const retryMeta = await retryRes.json();
                        // Merge retry metadata
                        m.patient = retryMeta.patient || m.patient;
                        m.payer = retryMeta.payer || m.payer;
                        m.provider = retryMeta.provider || m.provider;
                    }
                }

                let autoFilled = [];

                if (m.patient?.name) { setPatientName(m.patient.name); autoFilled.push('Name'); }
                if (m.patient?.dob) { setPatientDob(m.patient.dob); autoFilled.push('DOB'); }
                if (m.patient?.id) { setPatientId(m.patient.id); autoFilled.push('ID'); }

                if (m.payer) {
                    if (payers.includes(m.payer)) setSelectedPayer(m.payer);
                    else setSelectedPayer('Other');
                    autoFilled.push('Payer');
                }

                if (m.provider?.name && !providerName) setProviderName(m.provider.name);
                if (m.provider?.npi && !providerNpi) setProviderNpi(m.provider.npi);

                if (autoFilled.length > 0) {
                    console.log("Auto-filled fields:", autoFilled.join(', '));
                }
            }
        } catch (err) {
            setError(`Error processing file. Please ensure it is a valid Document or Image.`);
            console.error(err);
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleConfirm = async () => {
        if (!extractedText.trim()) {
            setError('Please provide clinical text (upload PDF or type manually).');
            return;
        }
        const cpt = cptInput.split(',').map((s) => s.trim()).filter(Boolean);
        const icd = icdInput.split(',').map((s) => s.trim()).filter(Boolean);

        // Auto-Save Logic: Shortcuts
        if (organizationId && (cpt.length > 0 || icd.length > 0)) {
            const newShortcut = { cpt: cptInput, icd: icdInput };
            const exists = savedShortcuts.some(s => s.cpt === newShortcut.cpt && s.icd === newShortcut.icd);

            if (!exists) {
                const updatedShortcuts = [newShortcut, ...savedShortcuts].slice(0, 10);
                setSavedShortcuts(updatedShortcuts);

                import('@/lib/supabaseClient').then(async ({ supabase }) => {
                    await supabase
                        .from('organizations')
                        .update({ saved_preferences: { shortcuts: updatedShortcuts } })
                        .eq('id', organizationId);
                });
            }
        }

        // Auto-Save Logic: Provider Details (History & Profile)
        if (organizationId && providerName) {
            import('@/lib/supabaseClient').then(async ({ supabase }) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // 1. Update Profile (Current User's NPI/Name)
                    /* 
                       Note: We are DECOUPLING the "History" from the "Profile". 
                       We only update the profile if it's currently empty or explicitly requested, 
                       but for now, we'll keep the existing logic of updating the active user's profile
                       as the "default" for next time. 
                    */
                    const metadataUpdates: any = {};
                    if (providerName && providerName.trim() !== '') metadataUpdates.full_name = providerName;
                    if (providerNpi && providerNpi.trim() !== '') metadataUpdates.npi = providerNpi;

                    if (Object.keys(metadataUpdates).length > 0) {
                        await supabase
                            .from('user_profiles')
                            .update(metadataUpdates)
                            .eq('id', user.id);
                    }

                    // 2. Update Org (TIN/Clinic Name fallback)
                    const orgUpdates: any = {};
                    if (providerClinicName) orgUpdates.name = providerClinicName;
                    if (providerTin) orgUpdates.tin = providerTin;
                    if (providerNpi && !metadataUpdates.npi) orgUpdates.npi = providerNpi;

                    // 3. Update Provider History in Saved Preferences
                    const newProvider = {
                        name: providerName,
                        npi: providerNpi,
                        tin: providerTin,
                        clinicName: providerClinicName
                    };

                    // Logic: Remove existing entry (if any) and add new version to top (LRU)
                    const others = savedProviders.filter(p =>
                        !(p.name === newProvider.name && p.npi === newProvider.npi)
                    );

                    // Always update local state
                    let newSavedProviders = [newProvider, ...others].slice(0, 20);
                    setSavedProviders(newSavedProviders);
                    let preferencesUpdated = true;

                    if (Object.keys(orgUpdates).length > 0 || preferencesUpdated) {
                        // We need to fetch the current preferences again to ensure we don't overwrite shortcuts if we didn't touch them
                        // Or we can just use our local state since we loaded it.
                        // Let's assume local state 'savedShortcuts' and 'newSavedProviders' are the source of truth.

                        const mergedPreferences = {
                            shortcuts: savedShortcuts,
                            providers: newSavedProviders
                        };
                        orgUpdates.saved_preferences = mergedPreferences;

                        await supabase
                            .from('organizations')
                            .update(orgUpdates)
                            .eq('id', organizationId);
                    }
                }
            });
        }

        onConfirm(extractedText, {
            cpt,
            icd,
            payer: selectedPayer,
            specialty: selectedSpecialty,
            tone: selectedTone.toLowerCase(),
            patientRaw: { name: patientName, id: patientId, dob: patientDob },
            providerRaw: { name: providerName, npi: providerNpi, tin: providerTin, clinicName: providerClinicName }
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">

            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
                    <p className="text-slate-500 text-sm mt-1">{description}</p>
                </div>
            </div>

            <div className="p-8 space-y-8">
                {/* Upload Section */}
                <div
                    className="group border-2 border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50 text-center hover:bg-blue-50/50 hover:border-blue-400/50 transition-all duration-300 cursor-pointer relative"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.docx"
                        onChange={handleFileUpload}
                    />
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300 ring-1 ring-slate-100">
                            {isProcessing ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            ) : (
                                <FileType className="w-8 h-8 text-blue-600" />
                            )}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-slate-700">
                                <span className="text-blue-600 hover:text-blue-700">Click to upload</span> or drag and drop
                            </div>
                            <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (max 10MB)</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                        <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Patient Information Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Patient Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Patient Name</label>
                            <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="John Doe" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth</label>
                            <input type="date" value={patientDob} onChange={(e) => setPatientDob(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Member ID</label>
                            <input type="text" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="XYZ123456" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                        </div>
                    </div>
                </div>

                {/* Provider Information Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Provider Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">
                                Provider/Physician Name
                                {(orgMembers.length > 0 || savedProviders.length > 0) && (
                                    <span className="text-xs font-normal text-blue-600 ml-2">(Select from History)</span>
                                )}
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={providerName}
                                    onChange={(e) => setProviderName(e.target.value)}
                                    placeholder="Dr. Smith"
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm pr-8"
                                />
                                {(orgMembers.length > 0 || savedProviders.length > 0) && (
                                    <>
                                        {/* Visual Indicator */}
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                        {/* Invisible Select Trigger - Positioned ONLY over the icon/right side */}
                                        <select
                                            className="absolute inset-y-0 right-0 w-10 opacity-0 cursor-pointer"
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // Check Team Members
                                                const member = orgMembers.find(m => m.id === value);
                                                if (member) {
                                                    setProviderName(member.name);
                                                    if (member.npi) setProviderNpi(member.npi);
                                                    return;
                                                }
                                                // Check History
                                                if (value.startsWith('hist_')) {
                                                    const index = parseInt(value.replace('hist_', ''));
                                                    const p = savedProviders[index];
                                                    if (p) {
                                                        setProviderName(p.name);
                                                        setProviderNpi(p.npi);
                                                        setProviderTin(p.tin);
                                                        setProviderClinicName(p.clinicName);
                                                    }
                                                }
                                            }}
                                            value=""
                                        >
                                            <option value="" disabled>Select Provider...</option>

                                            {orgMembers.length > 0 && (
                                                <optgroup label="Team Members">
                                                    {orgMembers.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}

                                            {savedProviders.length > 0 && (
                                                <optgroup label="History">
                                                    {savedProviders.map((p, i) => (
                                                        <option key={`hist_${i}`} value={`hist_${i}`}>
                                                            {p.name} {p.npi ? `(${p.npi})` : ''}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    </>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Hospital / Clinic Name</label>
                            <input type="text" value={providerClinicName} onChange={(e) => setProviderClinicName(e.target.value)} placeholder="General Hospital" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">NPI Number</label>
                            <input type="text" value={providerNpi} onChange={(e) => setProviderNpi(e.target.value)} placeholder="1234567890" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Tax ID (TIN)</label>
                            <input type="text" value={providerTin} onChange={(e) => setProviderTin(e.target.value)} placeholder="XX-XXXXXXX" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div className="col-span-1 md:col-span-2 text-right">
                            <p className="text-[10px] text-slate-400 italic">
                                * These details will be saved to your Settings automatically.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Clinical Data Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Clinical Details</h3>
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-700 ml-1">
                            Clinical Notes / Extracted Text
                        </label>
                        <div className="relative">
                            <textarea
                                value={extractedText}
                                onChange={(e) => setExtractedText(e.target.value)}
                                placeholder="Parsed content will appear here..."
                                className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none placeholder:text-slate-400"
                            />
                            {extractedText && (
                                <div className="absolute bottom-3 right-3 text-xs text-emerald-600 flex items-center bg-white px-2 py-1 rounded-full shadow-sm border border-emerald-100">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Ready
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-700 ml-1">CPT Codes</label>
                            <input
                                type="text"
                                value={cptInput}
                                onChange={(e) => setCptInput(e.target.value)}
                                placeholder="e.g. 99213, 99214"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            />
                            {/* Quick Select Buttons */}
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-full mb-1">Common Presets</span>
                                    {[
                                        { label: 'MRI Lumbar', cpt: '72148', icd: 'M54.5' },
                                        { label: 'CT Head', cpt: '70450', icd: 'R51.9' },
                                        { label: 'Knee Repl', cpt: '27447', icd: 'M17.11' },
                                        { label: 'PT Eval', cpt: '97161', icd: 'M54.5' },
                                        { label: 'Sleep Study', cpt: '95810', icd: 'G47.33' },
                                        { label: 'Dental Crown', cpt: 'D2740', icd: 'K02.9' },
                                    ].map((proc) => (
                                        <button
                                            key={proc.label}
                                            onClick={() => {
                                                setCptInput(proc.cpt);
                                                setIcdInput(proc.icd);
                                            }}
                                            className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors border border-slate-200"
                                        >
                                            + {proc.label}
                                        </button>
                                    ))}
                                </div>

                                {savedShortcuts.length > 0 && (
                                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider w-full mb-1">My History</span>
                                        {savedShortcuts.map((cut, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setCptInput(cut.cpt);
                                                    setIcdInput(cut.icd);
                                                }}
                                                className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors border border-blue-100 flex items-center"
                                            >
                                                {cut.cpt} / {cut.icd}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-700 ml-1">ICD-10 Codes</label>
                            <div className="space-y-2">
                                {/* Chip List */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {icdInput.split(',').map(s => s.trim()).filter(Boolean).map((code) => (
                                        <div key={code} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold flex items-center border border-blue-100">
                                            {code}
                                            <button
                                                onClick={() => {
                                                    const newCodes = icdInput.split(',').map(s => s.trim()).filter(s => s !== code);
                                                    setIcdInput(newCodes.join(', '));
                                                }}
                                                className="ml-1.5 hover:text-blue-900"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <ICDAutocomplete
                                    onSelect={(item) => {
                                        const current = icdInput.split(',').map(s => s.trim()).filter(Boolean);
                                        if (!current.includes(item.code)) {
                                            setIcdInput([...current, item.code].join(', '));
                                        }
                                    }}
                                />
                                <div className="text-xs text-slate-400 mt-1 pl-1">
                                    Search by code (e.g. M23) or keyword (e.g. Meniscus)
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-700 ml-1">Insurance Payer</label>
                            <div className="relative">
                                <select
                                    value={selectedPayer}
                                    onChange={(e) => setSelectedPayer(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none"
                                >
                                    <option value="">Select Insurance Provider...</option>
                                    {payers.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-700 ml-1">Clinical Specialty</label>
                            <div className="relative">
                                <select
                                    value={selectedSpecialty}
                                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none appearance-none"
                                >
                                    <option value="">Auto-Detect / General</option>
                                    {specialties.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-700 ml-1">Writing Tone</label>
                            <div className="relative">
                                <select
                                    value={selectedTone}
                                    onChange={(e) => setSelectedTone(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none appearance-none"
                                >
                                    {tones.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={handleConfirm}
                    className="w-full flex items-center justify-center py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.99]"
                >
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Document
                </button>
            </div>
        </div >
    );
}
