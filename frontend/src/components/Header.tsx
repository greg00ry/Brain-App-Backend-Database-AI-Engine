import React from "react";
import { Activity } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="h-16 border-b border-white/10 bg-white/5 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">
            Neural Link Active
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3 text-slate-400">
        <Activity size={16} className="text-purple-400" />
        <span className="font-mono text-[11px] text-purple-300 uppercase tracking-tight">
          Nano-Transformer (Custom v1.02)
        </span>
      </div>
    </header>
  );
};

export default Header;