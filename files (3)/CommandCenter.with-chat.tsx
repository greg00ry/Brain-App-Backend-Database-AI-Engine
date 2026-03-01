import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Layout, Database, Brain, Activity, Settings, PenTool, X, Maximize2, Minimize2 } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  facts?: string[];
  sources?: string[];
  isStreaming?: boolean;
}

type BrainState = 'idle' | 'thinking' | 'searching' | 'processing' | 'success' | 'error';

// ═══════════════════════════════════════════════════════════════════════════════
// BRAIN LOGO COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface BrainLogoProps {
  state: BrainState;
  size?: number;
}

const BrainLogo: React.FC<BrainLogoProps> = ({ state, size = 224 }) => {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer Glow */}
      <div className={`absolute inset-0 rounded-full transition-all duration-700 ${
        state === 'idle' ? 'bg-purple-500/5 blur-[80px]' :
        state === 'thinking' ? 'bg-purple-500/20 blur-[100px] animate-pulse' :
        state === 'searching' ? 'bg-cyan-500/20 blur-[100px]' :
        state === 'processing' ? 'bg-blue-500/20 blur-[100px] animate-pulse' :
        state === 'success' ? 'bg-green-500/20 blur-[80px]' :
        'bg-red-500/20 blur-[80px]'
      }`} />

      {/* Rotating Ring */}
      <div className={`absolute inset-8 border-2 rounded-full transition-all duration-500 ${
        state === 'idle' ? 'border-purple-500/20' :
        state === 'thinking' ? 'border-purple-400/40 animate-spin-slow' :
        state === 'searching' ? 'border-cyan-400/40 animate-spin' :
        state === 'processing' ? 'border-blue-400/40 animate-spin-slow' :
        state === 'success' ? 'border-green-400/40' :
        'border-red-400/40'
      }`} />

      {/* Brain Icon */}
      <Brain 
        size={size * 0.6}
        strokeWidth={1.5}
        className={`relative transition-all duration-500 ${
          state === 'idle' ? 'text-purple-400/80 scale-100' :
          state === 'thinking' ? 'text-purple-400 scale-105 animate-pulse' :
          state === 'searching' ? 'text-cyan-400 scale-110' :
          state === 'processing' ? 'text-blue-400 scale-105' :
          state === 'success' ? 'text-green-400 scale-110' :
          'text-red-400 scale-95'
        }`}
      />

      {/* Status Text */}
      <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border text-xs font-mono uppercase tracking-wider transition-all ${
        state === 'idle' ? 'bg-slate-900/90 border-purple-500/30 text-purple-400' :
        state === 'thinking' ? 'bg-purple-900/30 border-purple-400/50 text-purple-300 animate-pulse' :
        state === 'searching' ? 'bg-cyan-900/30 border-cyan-400/50 text-cyan-300' :
        state === 'processing' ? 'bg-blue-900/30 border-blue-400/50 text-blue-300' :
        state === 'success' ? 'bg-green-900/30 border-green-400/50 text-green-300' :
        'bg-red-900/30 border-red-400/50 text-red-300'
      }`}>
        {state === 'idle' ? 'Ready' :
         state === 'thinking' ? 'Analyzing' :
         state === 'searching' ? 'Searching' :
         state === 'processing' ? 'Processing' :
         state === 'success' ? 'Complete' :
         'Error'}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND CENTER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const CommandCenter: React.FC = () => {
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [brainState, setBrainState] = useState<BrainState>('idle');
  const [statusText, setStatusText] = useState<string>("Neural Engine Online");
  const [chatExpanded, setChatExpanded] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Quick Actions
  const quickActions = [
    { icon: <Layout size={18} />, label: "Console", prompt: "Otwórz Neural Console" },
    { icon: <PenTool size={18} />, label: "Training", prompt: "Rozpocznij trening" },
    { icon: <Database size={18} />, label: "Memory", prompt: "Przeszukaj pamięć" },
    { icon: <Brain size={18} />, label: "Map", prompt: "Pokaż mapę" },
    { icon: <Activity size={18} />, label: "Status", prompt: "Status systemu" },
    { icon: <Settings size={18} />, label: "Settings", prompt: "Ustawienia" },
  ];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Quick Action
  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  // Send Message with SSE Streaming
  const handleSendMessage = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      id: Date.now(), 
      text: input, 
      sender: 'user' 
    };
    setMessages(prev => [...prev, userMessage]);
    
    const userInput = input;
    setInput("");
    setIsLoading(true);
    setBrainState('thinking');
    setStatusText("Initializing neural pathways...");

    const token = localStorage.getItem("token");

    // Prepare AI message placeholder
    const aiMessageId = Date.now() + 1;
    let currentAIMessage: Message = {
      id: aiMessageId,
      text: "",
      sender: 'ai',
      isStreaming: true
    };
    setMessages(prev => [...prev, currentAIMessage]);

    try {
      const response = await fetch("http://localhost:3001/api/intent/stream", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: userInput })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(trimmedLine.substring(6));
            
            console.log('[SSE] Received:', data);
            
            // ═══════════════════════════════════════════════════════════════════
            // Handle different stages from intent.controller.ts
            // ═══════════════════════════════════════════════════════════════════

            if (data.stage === 'intent') {
              if (data.status === 'processing') {
                setBrainState('thinking');
                setStatusText('Classifying intent...');
              } else if (data.status === 'complete') {
                setStatusText(`Detected: ${data.data?.action || 'unknown'}`);
              }
            }

            if (data.stage === 'processing') {
              setBrainState('processing');
              setStatusText('Processing neural data...');
            }

            if (data.stage === 'answer' && data.content) {
              const cleanContent = data.content.replace(/^📝\s*/, '');
              
              currentAIMessage = {
                ...currentAIMessage,
                text: cleanContent,
                isStreaming: false
              };
              
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId ? currentAIMessage : msg
              ));
              
              setBrainState('success');
              setStatusText('Response generated');
            }

            if (data.stage === 'action') {
              setBrainState('searching');
              setStatusText(data.content || 'Executing action...');
            }

            if (data.stage === 'results' && data.status === 'complete') {
              // Add research results to AI message
              if (data.data?.facts || data.data?.sources) {
                currentAIMessage = {
                  ...currentAIMessage,
                  facts: data.data.facts,
                  sources: data.data.sources
                };
                
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId ? currentAIMessage : msg
                ));
              }
              
              setBrainState('success');
              setStatusText('Research complete');
            }

            if (data.stage === 'complete') {
              setBrainState('idle');
              setStatusText('Neural Engine Online');
              setIsLoading(false);
            }

            if (data.stage === 'error') {
              setBrainState('error');
              setStatusText('Connection error');
              
              currentAIMessage = {
                ...currentAIMessage,
                text: data.content || "⚠️ An error occurred",
                isStreaming: false
              };
              
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId ? currentAIMessage : msg
              ));
            }
            
            if (data.done) break;
          } catch (err) {
            console.warn("Parse error:", err);
          }
        }
      }
      
    } catch (error) {
      console.error("Streaming error:", error);
      setBrainState('error');
      setStatusText('Neural connection failed');
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, text: "⚠️ Connection error. Please try again.", isStreaming: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (brainState !== 'error') {
          setBrainState('idle');
          setStatusText('Neural Engine Online');
        }
      }, 2000);
    }
  };

  // Render Message
  const renderMessage = (msg: Message) => {
    const isUser = msg.sender === 'user';
    
    return (
      <div 
        key={msg.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 fade-in`}
      >
        <div className={`max-w-2xl ${isUser ? '' : 'space-y-3'}`}>
          {/* Message Bubble */}
          <div className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-purple-600/20 text-purple-100 border border-purple-500/30'
              : 'bg-slate-800/60 text-slate-200 border border-slate-700/40'
          } font-mono text-sm leading-relaxed relative`}>
            {msg.text}
            
            {/* Streaming indicator */}
            {msg.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-purple-400 animate-pulse" />
            )}
          </div>

          {/* Research Results */}
          {!isUser && msg.facts && msg.facts.length > 0 && (
            <div className="bg-slate-900/50 border border-cyan-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database size={16} className="text-cyan-400" />
                <span className="text-cyan-400 font-mono text-xs uppercase tracking-wider">
                  Research Results
                </span>
              </div>
              
              <ul className="space-y-2">
                {msg.facts.map((fact, idx) => (
                  <li key={idx} className="text-slate-300 text-sm font-mono flex gap-2">
                    <span className="text-cyan-400">•</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-cyan-500/20">
                  <div className="text-xs text-slate-400 font-mono mb-2">SOURCES:</div>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((source, idx) => (
                      <a 
                        key={idx}
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-mono"
                      >
                        {new URL(source).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none" />
      
      {/* Radial Gradient */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 p-6 border-b border-purple-500/10 bg-slate-900/40 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Brain size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white uppercase italic tracking-tight">
                The Brain <span className="text-[10px] text-purple-400 font-mono ml-1 not-italic">v1.0</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                Neural Command Center
              </p>
            </div>
          </div>
          
          {/* Status */}
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-mono text-purple-400">{statusText}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex-1 flex">
        {/* Chat Window */}
        <div className={`relative z-10 flex flex-col bg-slate-900/40 backdrop-blur-sm border-r border-purple-500/10 transition-all duration-300 ${
          chatExpanded ? 'w-2/3' : 'w-96'
        }`}>
          {/* Chat Header */}
          <div className="p-4 border-b border-purple-500/10 flex items-center justify-between">
            <h2 className="text-sm font-mono text-purple-400 uppercase tracking-wider">
              Neural Conversation
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setChatExpanded(!chatExpanded)}
                className="p-2 hover:bg-purple-500/10 rounded-lg transition-colors"
              >
                {chatExpanded ? (
                  <Minimize2 size={16} className="text-slate-400" />
                ) : (
                  <Maximize2 size={16} className="text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-purple-500/20">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <Brain size={48} className="text-purple-400/30 mx-auto" />
                  <p className="text-sm text-slate-500 font-mono">
                    Start a conversation...
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-purple-500/10">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Enter neural command..."
                  disabled={isLoading}
                  rows={1}
                  className="w-full bg-slate-800/80 border border-purple-500/30 rounded-xl px-4 py-3 pr-12 text-sm font-mono text-purple-100 placeholder-slate-500 focus:outline-none focus:border-purple-400 resize-none transition-colors max-h-32"
                />
                {isLoading && (
                  <Loader2 
                    size={18} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" 
                  />
                )}
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-purple-500/30"
              >
                <Send size={18} className="mx-auto" />
              </button>
            </div>
          </form>
        </div>

        {/* Brain Logo Area */}
        <div className="relative flex-1 flex flex-col items-center justify-center pb-32">
          <BrainLogo state={brainState} size={320} />
        </div>
      </div>

      {/* Bottom Quick Actions */}
      <div className="relative z-10 border-t border-purple-500/10 bg-slate-900/60 backdrop-blur-xl p-4">
        <div className="flex gap-2 flex-wrap justify-center">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickAction(action.prompt)}
              disabled={isLoading}
              className="group flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 rounded-lg transition-all disabled:opacity-30"
            >
              <span className="text-purple-400 group-hover:scale-110 transition-transform">
                {action.icon}
              </span>
              <span className="text-xs font-medium text-slate-400 group-hover:text-purple-400">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
