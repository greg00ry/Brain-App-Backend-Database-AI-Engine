import React from "react";
import { Layout, Database, Brain, Activity, Settings } from 'lucide-react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active = false }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${
    active 
      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' 
      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
  }`}>
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </div>
);

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-white/10 bg-white/5 flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Brain size={20} className="text-white" />
        </div>
        <h1 className="font-bold tracking-tight text-white uppercase italic">
          The Brain <span className="text-[10px] text-purple-400 font-mono ml-1 not-italic">v1.0</span>
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <NavItem icon={<Layout size={18} />} label="Neural Console" active />
        <NavItem icon={<Database size={18} />} label="Memory Vault" />
        <NavItem icon={<Brain size={18} />} label="Neural Map" />
        <NavItem icon={<Activity size={18} />} label="Activity Trace" />
      </nav>

      <div className="px-4 py-6">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">
          Recent Synapses
        </h3>
        <div className="space-y-1">
          <div className="text-xs text-slate-400 hover:text-purple-400 hover:bg-white/5 p-2 rounded-lg cursor-pointer transition-all border-l border-transparent hover:border-purple-500 truncate">
            # Architektura Systemu AI
          </div>
          <div className="text-xs text-slate-400 hover:text-purple-400 hover:bg-white/5 p-2 rounded-lg cursor-pointer transition-all border-l border-transparent hover:border-purple-500 truncate">
            # Planowanie Bazy NoSQL
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/10 space-y-2">
        <NavItem icon={<Settings size={18} />} label="Neural Link" />
        <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
           <div className="text-[10px] text-purple-400 font-bold uppercase mb-1 tracking-wider">Local Engine</div>
           <div className="text-xs text-slate-400">Status: Optimized</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;