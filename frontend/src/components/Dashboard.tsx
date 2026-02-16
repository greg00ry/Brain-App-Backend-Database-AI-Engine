import React, { useState } from "react";
import { Layout, Database, Brain, Terminal, Settings, Activity } from 'lucide-react';
import axios from "axios";

const Dashboard: React.FC = () => {
    const [query, setQuery] = useState<string>("");
    const [analysisResult, setAnalysisResult] = useState<any | null>("")
    const [error, setError] = useState<string | null>("")
    
    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        const token = localStorage.getItem("token")

        try {
            const response = await axios.post("http://localhost:3001/api/analyze", {
                text: query
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            setAnalysisResult(response)
            //in process




        } catch (error: any) {
            console.log("Sending message failed: ", error)
            setError(error.response?.data?.message || "Wystapił błąd podczas wysyłania wiadomości")
        }
    }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-slate-200 font-sans">
      {/* SIDEBAR - Styl Atlas */}
      <aside className="w-64 border-r border-white/10 bg-white/5 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="bg-green-500 w-3 h-3 rounded-full animate-pulse" />
          <h1 className="font-bold tracking-tight text-white">THE BRAIN <span className="text-green-500 text-xs">v1.0</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            icon={<Layout size={20}/>} 
            label="Overview" 
            active 
            
          />
          <NavItem 
            icon={<Database size={20}/>} 
            label="Data Collections" 
          />
          <NavItem 
            icon={<Brain size={20}/>} 
            label="NLU Engine" 
          />
          <NavItem 
            icon={<Activity size={20}/>} 
            label="Logs & Metrics" 
          />
        </nav>

        <div className="p-4 border-t border-white/10">
          <NavItem 
            icon={<Settings size={20}/>} 
            label="Settings" 
          />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-16 border-b border-white/10 bg-white/5 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>Status: <span className="text-green-500 font-medium">Local Engine Connected</span></span>
            <span className="w-px h-4 bg-white/10" />
            <span>Model: <span className="text-blue-400 font-medium">Nano-Transformer (Custom)</span></span>
          </div>
        </header>

        {/* CONSOLE AREA */}
        <section className="flex-1 p-8 overflow-y-auto space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* AI INPUT CARD */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-2xl">
              <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4 block">Human Language Instruction</label>
              <div className="relative">
                <form onSubmit={handleSubmit}>
                    <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., Show me all unpaid invoices from Warsaw..."
                    className="w-full bg-[#020817] border border-slate-700 rounded-lg py-4 px-6 text-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all shadow-inner"
                    />
                    <button type="submit" className="absolute right-3 top-3 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md font-medium transition-colors">
                    Execute
                    </button>
                </form>
              </div>
            </div>

            {/* LIVE PARSER / OUTPUT */}
            <div className="grid grid-cols-2 gap-6 h-64">
              <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-4 flex flex-col">
                <span className="text-[10px] uppercase text-slate-500 font-bold mb-2 flex items-center gap-2">
                  <Terminal size={12}/> Tokenization Output (Tiktoken)
                </span>
                <div className="flex-1 bg-black/40 rounded p-3 font-mono text-xs text-blue-300 overflow-auto">
                  {/* Tu będziemy mapować tokeny */}
                  [ 1542, 432, 9901, 12, 54 ... ]
                </div>
              </div>
              <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-4 flex flex-col">
                <span className="text-[10px] uppercase text-slate-500 font-bold mb-2 flex items-center gap-2">
                   <Brain size={12}/> Intent Parser (JSON)
                </span>
                <div className="flex-1 bg-black/40 rounded p-3 font-mono text-xs text-green-400 overflow-auto">
                  {JSON.stringify(analysisResult.data, null, 4)}
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active = false, className = "" }: { icon: any, label: string, active?: boolean, className?: string }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${active ? ' bg-purple-700 text-white' : 'text-slate-400 hover:bg-purple-900 hover:text-white'} ${className}`}>
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </div>
);


export { Dashboard };