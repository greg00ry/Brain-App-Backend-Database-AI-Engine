import React, { useState } from "react";
import { Brain, Activity, Send, User } from 'lucide-react';
import Sidebar from "./Sidebar"
import axios from "axios";

const Dashboard: React.FC = () => {
    const [query, setQuery] = useState<string>("");
    // Inicjalizujemy null, żeby łatwo sprawdzać czy mamy już dane
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

            // Zapisujemy .data, nie cały obiekt response!
            setAnalysisResult(response.data);
            setQuery(""); // Czyścimy input po wysłaniu

        } catch (error: any) {
            console.log("Sending message failed: ", error);
            setError(error.response?.data?.message || "Wystąpił błąd podczas wysyłania wiadomości");
        }
    };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-slate-200 font-sans">
      
      <Sidebar />

      {/* GŁÓWNA STRONA - NEURAL CHAT */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* TOP BAR */}
        <header className="h-16 border-b border-white/10 bg-white/5 flex items-center justify-between px-8">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Neural Link Active</span>
            </div>
            <div className="text-slate-400 text-sm font-mono flex items-center gap-2">
                <Activity size={14} className="text-purple-500" />
                <span className="text-xs">Processing via Nano-Transformer</span>
            </div>
        </header>

        {/* MESSAGES AREA */}
        <section className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
            
            {/* Przykładowa wiadomość użytkownika */}
            <div className="flex justify-end gap-3">
                <div className="max-w-[70%] bg-purple-600/20 border border-purple-500/30 rounded-2xl rounded-tr-none p-4 text-sm text-slate-200">
                    Witaj w moim drugim mózgu. Przeanalizuj dzisiejsze wpisy.
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-white/10">
                    <User size={16} className="text-slate-300" />
                </div>
            </div>

            {/* Dynamiczna odpowiedź bota */}
            <div className="flex justify-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                    <Brain size={18} className="text-white" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 text-sm text-slate-300 min-w-[300px]">
                    {!analysisResult ? (
                        <p className="italic text-slate-500">Oczekiwanie na zapytanie...</p>
                    ) : (
                        <div>
                            <p className="mb-4">Otrzymałem dane z analizy NLU. Oto co widzę pod spodem:</p>
                            <div className="p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-[11px] text-blue-300 overflow-x-auto whitespace-pre">
                                {JSON.stringify(analysisResult, null, 2)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-mono">
                    ERROR: {error}
                </div>
            )}
        </section>

        {/* CHAT INPUT AREA */}
        <footer className="p-8 bg-gradient-to-t from-slate-900 to-transparent">
            <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSubmit} className="relative">
                    <textarea 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Zapisz myśl lub wydaj polecenie..."
                        className="w-full bg-[#0b0f1a]/80 backdrop-blur-md border border-slate-700 rounded-2xl p-4 pr-16 focus:outline-none focus:border-purple-500 transition-all resize-none shadow-2xl text-slate-200"
                        rows={3}
                    />
                    <button 
                        type="submit"
                        disabled={!query.trim()}
                        className="absolute right-4 bottom-4 p-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-xl transition-all shadow-lg shadow-purple-500/30"
                    >
                        <Send size={18} />
                    </button>
                </form>
                <div className="mt-4 flex justify-center gap-8 text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                    <span>Memory Cluster: Alpha-01</span>
                    <span>•</span>
                    <span>LTM Consolidation: Active</span>
                    <span>•</span>
                    <span>Synapse Growth: 1.4% / hr</span>
                </div>
            </div>
        </footer>
      </main>
    </div>
  );
};

// Pomocniczy komponent NavItem
const NavItem = ({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${active ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </div>
);

export { Dashboard };