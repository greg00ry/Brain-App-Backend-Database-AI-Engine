import React, { useState } from "react";
import { Brain, Send, User, Activity } from 'lucide-react';
import Sidebar from "./Sidebar.tsx";
import Header from "./Header.tsx";
import TrainingCenter from "./TrainingCenter.tsx";
import axios from "axios";

const Dashboard: React.FC = () => {
    // Stan nawigacji między modułami
    const [activeTab, setActiveTab] = useState<string>("console");
    
    // Logika czatu (zostaje w Dashboardzie wg planu)
    const [query, setQuery] = useState<string>("");
    const [analysisResult, setAnalysisResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const token = localStorage.getItem("token");

        try {
            const response = await axios.post("http://localhost:3001/api/analyze", {
                text: query
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setAnalysisResult(response.data);
            setQuery(""); 
        } catch (error: any) {
            console.log("Sending message failed: ", error);
            setError(error.response?.data?.message || "Wystąpił błąd podczas wysyłania wiadomości");
        }
    };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-slate-200 font-sans overflow-hidden">
      
      {/* Sidebar z przekazanym stanem aktywności */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <Header />

        {/* Dynamiczne przełączanie widoku */}
        {activeTab === "console" ? (
            /* WIDOK: NEURAL CONSOLE (CZAT) */
            <div className="flex-1 flex flex-col overflow-hidden">
                <section className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                    <div className="flex justify-end gap-3">
                        <div className="max-w-[70%] bg-purple-600/20 border border-purple-500/30 rounded-2xl rounded-tr-none p-4 text-sm text-slate-200 shadow-lg">
                            Witaj w konsoli operacyjnej. Jakie dane mam dziś przetworzyć?
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-white/10">
                            <User size={16} className="text-slate-300" />
                        </div>
                    </div>

                    {analysisResult && (
                        <div className="flex justify-start gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                                <Brain size={18} className="text-white" />
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 text-sm text-slate-300 min-w-[300px]">
                                <p className="mb-4 font-bold text-purple-400 uppercase text-[10px] tracking-widest">Inference Response:</p>
                                <div className="p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-[11px] text-blue-300 overflow-x-auto">
                                    {JSON.stringify(analysisResult, null, 2)}
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-mono">
                            SYSTEM_ERROR: {error}
                        </div>
                    )}
                </section>

                <footer className="p-8 bg-gradient-to-t from-slate-900 to-transparent">
                    <div className="max-w-4xl mx-auto">
                        <form onSubmit={handleSubmit} className="relative">
                            <textarea 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Zapisz myśl lub wydaj polecenie..."
                                className="w-full bg-[#0b0f1a]/80 backdrop-blur-md border border-slate-700 rounded-2xl p-4 pr-16 focus:outline-none focus:border-purple-500 transition-all resize-none shadow-2xl text-slate-200 placeholder:text-slate-600"
                                rows={3}
                            />
                            <button 
                                type="submit"
                                disabled={!query.trim()}
                                className="absolute right-4 bottom-4 p-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-purple-500/30"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                        <div className="mt-4 flex justify-center gap-8 text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                            <span>Memory Cluster: Alpha-01</span>
                            <span>•</span>
                            <span>Synapse Growth: 1.4% / hr</span>
                        </div>
                    </div>
                </footer>
            </div>
        ) : activeTab === "training" ? (
            /* WIDOK: TRAINING UNIT (NOTATKI) */
            <TrainingCenter />
        ) : (
            /* PLACEHOLDER DLA INNYCH MODUŁÓW */
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
                <Activity size={48} className="animate-pulse opacity-20" />
                <p className="font-mono text-xs uppercase tracking-[0.3em]">Module in development...</p>
            </div>
        )}
      </main>
    </div>
  );
};

export { Dashboard };