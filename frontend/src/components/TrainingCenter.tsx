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