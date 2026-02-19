import React, { useState } from "react";
import { Database, Search, Layers, Tag, Eye, Trash2, Code } from 'lucide-react';
//DO CAŁKOWITEJ ZMIANY POGLĄDOWO OKEJ
const MemoryVault: React.FC = () => {
    // Makieta danych prosto z Twojej kolekcji w MongoDB
    const [documents] = useState([
        { _id: "65d3f1...", title: "Struktura Binary Tree (Car)", tags: ["uczelnia", "java"], date: "2026-01-16", preview: "Implementacja drzewa binarnego gdzie każdy węzeł..." },
        { _id: "65d4a2...", title: "Roadmapa Rozwoju", tags: ["planowanie", "node"], date: "2026-02-19", preview: "1. Fetch, 2. Middleware, 3. Schema vs Model..." },
        { _id: "65d5b3...", title: "Notatki z sesji: Brain OS", tags: ["wizja", "architektura"], date: "2026-02-19", preview: "Koncepcja systemu opartego na Linuxie z obsługą sudo..." }
    ]);

    return (
        <div className="flex-1 p-8 bg-slate-950 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <header className="mb-10 flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Layers className="text-green-500" /> MongoDB Atlas Vault
                        </h2>
                        <p className="text-slate-500 text-sm mt-2 font-mono">
                            Cluster: <span className="text-green-400">Production-01</span> | Collection: <span className="text-blue-400">synapses</span>
                        </p>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input 
                                type="text" 
                                placeholder="Query collection..." 
                                className="bg-[#0b0f1a] border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-300 focus:border-green-500/50 outline-none w-80 transition-all"
                            />
                        </div>
                    </div>
                </header>

                {/* GRID DOKUMENTÓW */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((doc) => (
                        <div key={doc._id} className="bg-[#0b0f1a] border border-slate-800 rounded-2xl p-6 hover:border-green-500/30 transition-all group flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-mono text-slate-600 truncate w-32">ID: {doc._id}</span>
                                    <div className="flex gap-2">
                                        <Tag size={12} className="text-green-500" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-slate-200 mb-2 group-hover:text-green-400 transition-colors">
                                    {doc.title}
                                </h3>
                                <p className="text-slate-500 text-xs line-clamp-3 font-sans leading-relaxed">
                                    {doc.preview}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                                <div className="flex gap-2">
                                    {doc.tags.map(tag => (
                                        <span key={tag} className="text-[9px] uppercase tracking-widest bg-slate-900 text-slate-400 px-2 py-1 rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-3 text-slate-500">
                                    <button className="hover:text-white transition-colors"><Code size={16} />View JSON</button>
                                    <button className="hover:text-green-400 transition-colors"><Eye size={16} />Expand</button>
                                    <button className="hover:text-red-500 transition-colors"><Trash2 size={16} />Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* ADD NEW PLACEHOLDER */}
                    <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-600 hover:border-slate-700 hover:text-slate-500 cursor-pointer transition-all">
                        <Database size={32} className="mb-2 opacity-20" />
                        <span className="text-xs font-bold uppercase tracking-widest">New Schema Entry</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemoryVault;