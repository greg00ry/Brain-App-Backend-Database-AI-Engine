import React, { useState, useEffect } from "react";
import { Database, Brain, Trash2, Bookmark, Activity, Zap, Plus } from 'lucide-react';

const MemoryVault: React.FC = () => {
    const [data, setData] = useState<{synapses: any[], memories: any[], categories: any[]}>({
        synapses: [], memories: [], categories: []
    });
    const [activeTab, setActiveTab] = useState<'synapses' | 'memories'>('synapses');
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Usunąć ten wpis z pamięci?")) return;
        setDeletingId(id);
        try {
            const res = await fetch(`http://localhost:3001/api/entries/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) throw new Error("Delete failed");
            setData(prev => ({
                ...prev,
                synapses: prev.synapses.filter(s => s._id !== id),
                memories: prev.memories.filter(m => m._id !== id),
            }));
        } catch (error) {
            console.error("Delete error:", error);
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetch('http://localhost:3001/api/entries', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error("Vault Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">

            {/* HEADER */}
            <header className="px-6 py-4 border-b border-white/5 bg-slate-900/20 flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <Database className="text-blue-400 shrink-0" size={20} />
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-white leading-none truncate">Memory Vault</h2>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em] mt-0.5">
                            Neural Storage: <span className="text-blue-400">Online</span>
                        </p>
                    </div>
                </div>

                {/* TAB SWITCHER */}
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                    <button
                        onClick={() => setActiveTab('synapses')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                            activeTab === 'synapses'
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        Entries
                    </button>
                    <button
                        onClick={() => setActiveTab('memories')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                            activeTab === 'memories'
                                ? 'bg-purple-600 text-white shadow'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        Long_Term
                    </button>
                </div>
            </header>

            {/* CATEGORIES BAR */}
            {data.categories.length > 0 && (
                <div className="px-6 py-3 border-b border-white/5 bg-slate-900/10 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                    {data.categories.map(cat => (
                        <div
                            key={cat._id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shrink-0"
                        >
                            <span className="text-sm">{cat.icon}</span>
                            <span
                                className="text-[9px] font-bold uppercase tracking-widest"
                                style={{ color: cat.color }}
                            >
                                {cat.name}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide min-h-0">

                {loading && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-600 font-mono text-xs uppercase tracking-widest animate-pulse">
                            Accessing_Database...
                        </p>
                    </div>
                )}

                {!loading && (
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))' }}>

                        {/* SYNAPSES */}
                        {activeTab === 'synapses' && data.synapses.map(syn => (
                            <div
                                key={syn._id}
                                className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/30 p-5 rounded-2xl flex flex-col justify-between transition-all group"
                            >
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[9px] font-black px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20 uppercase tracking-widest">
                                            Node
                                        </span>
                                        <div className="flex items-center gap-1 text-slate-600 font-mono text-xs">
                                            <Activity size={11} /> {syn.strength}/10
                                        </div>
                                    </div>
                                    <h3 className="text-white font-bold text-base mb-2 line-clamp-1">
                                        {syn.summary || "New Synapse"}
                                    </h3>
                                    <p className="text-slate-500 text-xs leading-relaxed line-clamp-5">
                                        {syn.rawText}
                                    </p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center">
                                    <span className="text-[9px] text-slate-700 uppercase font-bold font-mono">
                                        {new Date(syn.createdAt).toLocaleDateString()}
                                    </span>
                                    <div className="flex gap-3 items-center">
                                        {syn.isAnalyzed && <Brain size={14} className="text-green-500" />}
                                        <Trash2
                                            size={14}
                                            onClick={() => handleDelete(syn._id)}
                                            className={`cursor-pointer transition-colors ${
                                                deletingId === syn._id
                                                    ? 'text-red-500 animate-pulse'
                                                    : 'text-slate-700 hover:text-red-500'
                                            }`}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* MEMORIES */}
                        {activeTab === 'memories' && data.memories.map(mem => (
                            <div
                                key={mem._id}
                                className="bg-slate-900/60 border border-slate-800 border-l-2 border-l-purple-600 hover:bg-slate-900/80 p-5 rounded-2xl flex flex-col justify-between transition-all"
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Bookmark size={12} className="text-purple-500" />
                                        <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">
                                            {mem.categoryName || "Knowledge"}
                                        </span>
                                    </div>
                                    <h3 className="text-white font-bold text-base mb-2 uppercase tracking-tight">
                                        {mem.topic || "Consolidated_Block"}
                                    </h3>
                                    <p className="text-slate-500 text-xs leading-relaxed italic line-clamp-4">
                                        "{mem.summary}"
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {mem.tags.map((t: string) => (
                                            <span
                                                key={t}
                                                className="text-[8px] font-bold bg-slate-950 text-slate-600 px-2 py-0.5 rounded border border-slate-800 uppercase"
                                            >
                                                #{t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center font-mono text-[9px] font-black text-slate-700 uppercase">
                                    <span>Sources: {mem.sourceEntryIds?.length || 0}</span>
                                    <div className="flex items-center gap-3">
                                        <span>{new Date(mem.createdAt).toLocaleDateString()}</span>
                                        <Trash2
                                            size={14}
                                            onClick={() => handleDelete(mem._id)}
                                            className={`cursor-pointer transition-colors ${
                                                deletingId === mem._id
                                                    ? 'text-red-500 animate-pulse'
                                                    : 'text-slate-700 hover:text-red-500'
                                            }`}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* PUSTA KARTA — ADD NEW */}
                        <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-700 hover:text-slate-500 cursor-pointer transition-all group min-h-[160px]">
                            <Plus
                                size={32}
                                className="mb-3 opacity-20 group-hover:opacity-50 group-hover:text-purple-400 transition-all"
                            />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                                New_Sync_Shot
                            </span>
                        </div>

                        {/* PUSTY STAN — brak danych */}
                        {!loading && activeTab === 'synapses' && data.synapses.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-700">
                                <Database size={40} className="mb-4 opacity-20" />
                                <p className="font-mono text-xs uppercase tracking-widest">No entries found</p>
                            </div>
                        )}
                        {!loading && activeTab === 'memories' && data.memories.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-700">
                                <Brain size={40} className="mb-4 opacity-20" />
                                <p className="font-mono text-xs uppercase tracking-widest">No long-term memories yet</p>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

export default MemoryVault;