import React, { useState } from "react";
import { Save, FileText, Upload } from 'lucide-react';
import axios from "axios";

const TrainingCenter: React.FC = () => {
    const [note, setNote] = useState<string>("");
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const handleSaveNote = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!note.trim()) return;

        setStatus('sending');
        const token = localStorage.getItem("token");

        try {
            // Tutaj docelowo inna ścieżka niż analyze, np. /api/train lub /api/notes
            await axios.post("http://localhost:3001/api/analyze", {
                content: note,
                type: 'manual_entry'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNote("");
            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            console.error("Training error:", error);
            setStatus('error');
        }
    };

    return (
        <div className="flex-1 p-8 bg-slate-900/50">
            <div className="max-w-4xl mx-auto space-y-8">
                <header>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <FileText className="text-purple-500" /> Neural Training Unit
                    </h2>
                    <p className="text-slate-400 text-sm mt-2">
                        Wprowadź surowe dane do konsolidacji w pamięci długoterminowej.
                    </p>
                </header>

                <div className="grid gap-6">
                    {/* INPUT NA NOTATKĘ */}
                    <div className="relative group">
                        <textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Wpisz treść notatki, którą system ma przyswoić..."
                            className="w-full bg-black/40 border border-slate-700 rounded-2xl p-6 min-h-[300px] focus:outline-none focus:border-purple-500 transition-all text-slate-200 shadow-inner"
                        />
                        <button 
                            onClick={handleSaveNote}
                            disabled={status === 'sending' || !note.trim()}
                            className="absolute right-6 bottom-6 flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl transition-all font-bold"
                        >
                            {status === 'sending' ? 'Przetwarzanie...' : <><Save size={18} /> Utrwal w pamięci</>}
                        </button>
                    </div>

                    {/* MIEJSCE NA PRZYSZŁE MODUŁY (PDF/FOTO) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 border border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-purple-500/50 transition-colors cursor-not-allowed">
                            <Upload className="mb-2 opacity-20" />
                            <span className="text-xs font-bold uppercase tracking-widest opacity-20">Import PDF (Soon)</span>
                        </div>
                        <div className="p-6 border border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-purple-500/50 transition-colors cursor-not-allowed">
                            <Upload className="mb-2 opacity-20" />
                            <span className="text-xs font-bold uppercase tracking-widest opacity-20">Visual Input (Soon)</span>
                        </div>
                    </div>
                </div>

                                {/* RAW TERMINAL UNIT - FULL WIDTH */}
                <div className="mt-8 w-full bg-[#0d1117]/90 border border-white/5 font-mono shadow-2xl rounded-xl overflow-hidden">
                {/* TREŚĆ LOGÓW - BEZ PASKÓW, SAMA ESENCJA */}
                <div className="p-5 h-64 overflow-y-auto text-[13px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                    <div className="flex gap-2 mb-3">
                    <span className="text-green-500">➜</span>
                    <span className="text-blue-400">~/the-brain/neural-engine</span>
                    <span className="text-slate-400">git:(</span><span className="text-red-400">main</span><span className="text-slate-400">)</span>
                    <span className="text-slate-200">npm run train:consolidate</span>
                    </div>
                    
                    <div className="space-y-1">
                    <p className="text-slate-500"><span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span> <span className="text-purple-400">INIT</span> LTM sequence start...</p>
                    <p className="text-slate-500"><span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span> <span className="text-blue-400">PROC</span> Tokenizing input stream (length: {note.length})...</p>
                    <p className="text-slate-500"><span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span> <span className="text-blue-400">KERN</span> Mapping synapses to vector space...</p>
                    <p className="text-slate-500"><span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span> <span className="text-green-500">OK</span> Cluster #A1-99 synchronized.</p>
                    <p className="text-slate-500"><span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span> <span className="text-yellow-400">WARN</span> Cognitive overlap detected in 'Architecture' node.</p>
                    <div className="flex gap-2 mt-2">
                        <span className="text-green-500">➜</span>
                        <span className="text-blue-400">~/the-brain/neural-engine</span>
                        <span className="animate-pulse w-2 h-4 bg-slate-500 inline-block"></span>
                    </div>
                    </div>
                </div>
                </div>
                
                {status === 'success' && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm text-center">
                        Notatka została pomyślnie przetworzona i dodana do synaps.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrainingCenter;