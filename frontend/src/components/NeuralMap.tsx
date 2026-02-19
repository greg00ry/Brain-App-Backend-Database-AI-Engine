import React from "react";

const NeuralMap: React.FC = () => {
  // Definiujemy kategorie i ich tematy z konkretnymi indeksami, żeby wiedzieć skąd-dokąd rysować linie
  const categories = [
    { id: 'linux', label: 'LINUX', x: 150, y: 150, color: '#3b82f6', topics: ['Sudo Policy', 'Bash Scripts', 'Kernel Modules', 'Cron Jobs', 'SSH Keys', 'UFW Firewall', 'Systemd'] },
    { id: 'mongo', label: 'MONGO', x: 500, y: 150, color: '#22c55e', topics: ['Mongoose Schema', 'Aggregation', 'Atlas Search', 'Indexes', 'GridFS', 'BSON Types', 'Replication'] },
    { id: 'node', label: 'NODE.JS', x: 450, y: 550, color: '#a855f7', topics: ['Express Mid', 'Child Process', 'FS Module', 'JWT Auth', 'WebSockets', 'Streams', 'Clusters'] },
    { id: 'python', label: 'PYTHON', x: 850, y: 400, color: '#eab308', topics: ['FastAPI', 'PyMongo', 'LangChain', 'NumPy', 'Pandas', 'NLP Engine', 'Inference'] },
    { id: 'sql', label: 'SQL', x: 150, y: 550, color: '#ef4444', topics: ['SQLite Bridge', 'Foreign Keys', 'Migrations', 'Queries', 'ACID', 'Transactions', 'Joins'] },
  ];

  // Funkcja pomocnicza do obliczania pozycji konkretnego tematu (satelity)
  const getTopicPos = (catId: string, topicIdx: number) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return { x: 0, y: 0 };
    const angle = (topicIdx / cat.topics.length) * 2 * Math.PI;
    const radius = 90;
    return {
      x: cat.x + Math.cos(angle) * radius,
      y: cat.y + Math.sin(angle) * radius
    };
  };

  // Precyzyjne punkty styku dla Twoich nowych synaps
  const posMongoose = getTopicPos('mongo', 0); // Mongoose Schema
  const posPyMongo = getTopicPos('python', 1);  // PyMongo
  const posFastAPI = getTopicPos('python', 0);  // FastAPI
  const posWebSockets = getTopicPos('node', 4); // WebSockets

  return (
    <div className="flex-1 bg-[#020202] relative overflow-hidden font-mono">
      <svg className="w-full h-full">
        {/* === GŁÓWNE SYNAPSY LOGICZNE (MIĘDZY TEMATAMI) === */}
        
        {/* 1. PyMongo <-> Mongoose Schema (Most danych) */}
        <path 
            d={`M ${posPyMongo.x} ${posPyMongo.y} Q 650 250 ${posMongoose.x} ${posMongoose.y}`} 
            stroke="#22c55e" strokeWidth="2" fill="transparent" strokeDasharray="4,2" className="opacity-60" 
        />
        
        {/* 2. FastAPI <-> WebSockets (Most komunikacji Live) */}
        <path 
            d={`M ${posFastAPI.x} ${posFastAPI.y} Q 700 600 ${posWebSockets.x} ${posWebSockets.y}`} 
            stroke="#a855f7" strokeWidth="2" fill="transparent" strokeDasharray="4,2" className="opacity-60" 
        />

        {categories.map((cat) => (
          <g key={cat.id}>
            {/* Hub Kategorii */}
            <circle cx={cat.x} cy={cat.y} r="18" fill={cat.color} className="opacity-80" />
            <text x={cat.x} y={cat.y - 30} textAnchor="middle" fill="white" className="text-[12px] font-bold tracking-widest">{cat.label}</text>

            {cat.topics.map((topic, i) => {
              const pos = getTopicPos(cat.id, i);
              return (
                <g key={i}>
                  <line x1={cat.x} y1={cat.y} x2={pos.x} y2={pos.y} stroke={cat.color} strokeWidth="1" opacity="0.2" />
                  <circle cx={pos.x} cy={pos.y} r="3" fill={cat.color} />
                  <text x={pos.x + 8} y={pos.y + 4} fill="#64748b" className="text-[9px]">{topic}</text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>

      {/* STATUS PANEL */}
      <div className="absolute top-10 right-10 p-4 border border-white/5 bg-black/40 backdrop-blur-md rounded-xl font-mono">
          <div className="text-[10px] text-slate-500 mb-2 font-bold uppercase tracking-widest">Cross-Module Bridges</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-green-400">
                <div className="w-1 h-1 bg-green-400 rounded-full animate-ping"></div>
                PyMongo → Mongoose (Shared Schema)
            </div>
            <div className="flex items-center gap-2 text-[10px] text-purple-400">
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-ping"></div>
                FastAPI → WebSockets (Live Feed)
            </div>
          </div>
      </div>
    </div>
  );
};

export default NeuralMap;