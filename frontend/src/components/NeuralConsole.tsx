import React, { useState, useRef, useEffect } from "react";
import { Send, Brain, Loader2 } from 'lucide-react';

// Typ dla wiadomości, może być rozbudowany o role (user/ai), timestamp, itp.
interface Message {
    id: number;
    text: string;
    sender: 'user' | 'ai';
}

const NeuralConsole: React.FC = () => {
    const [input, setInput] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: "Witaj Architekcie. Jak mogę Ci dzisiaj pomóc?", sender: 'ai' },
    ]);
    const [isLoading, setIsLoading] = useState<boolean>(false); // Stan ładowania
    const messagesEndRef = useRef<HTMLDivElement>(null); // Do auto-scrolla

    // Funkcja do scrollowania na dół po dodaniu nowej wiadomości
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // 1. Dodajemy wiadomość użytkownika do chatu
    const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setIsLoading(true);

    const token = localStorage.getItem("token");

    // 2. Przygotowujemy pustą wiadomość od AI
    const aiMessageId = Date.now() + 1;
    setMessages(prev => [...prev, { id: aiMessageId, text: "", sender: 'ai' }]);

    try {
        const response = await fetch("http://localhost:3001/api/intent", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                text: userInput  // ← Zmienione z 'messages' na 'text'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Błąd z backendu:", errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Backend zwraca JSON, nie stream!
        // Więc zamiast streamowania, po prostu odczytaj odpowiedź:
        const result = await response.json();
        
        console.log("Otrzymana odpowiedź:", result);
        
        // Aktualizuj wiadomość AI z otrzymaną odpowiedzią
        setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
                ? { 
                    ...msg, 
                    text: `Akcja: ${result.action}\nUzasadnienie: ${result.reasoning}` 
                  } 
                : msg
        ));
        
    } catch (error) {
        console.error("Błąd streamingu:", error);
        setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
                ? { ...msg, text: "Błąd połączenia z Neural Engine." } 
                : msg
        ));
    } finally {
        setIsLoading(false);
    }
};

    return (
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {/* Nagłówek konsoli */}
            <header className="p-6 border-b border-white/5 bg-slate-900/20 flex items-center gap-3">
                <Brain className="text-purple-500" size={24} />
                <h2 className="text-xl font-bold text-white">Neural Console</h2>
                <p className="text-[10px] text-slate-500 ml-4 font-mono uppercase tracking-[0.2em]">
                    Active Session: <span className="text-purple-400">Architekt</span>
                </p>
            </header>

            {/* Obszar wiadomości */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-xl p-4 rounded-2xl ${
                            msg.sender === 'user' 
                                ? 'bg-purple-700 text-white rounded-br-none' 
                                : 'bg-slate-800 text-slate-200 rounded-bl-none'
                        } shadow-lg font-sans text-sm leading-relaxed`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {/* Element do scrollowania na dół */}
                <div ref={messagesEndRef} />
            </div>

            {/* Input do pisania wiadomości */}
            <form onSubmit={handleSendMessage} className="p-6 border-t border-white/5 bg-slate-900/20 flex items-center gap-4">
                <div className="relative flex-1">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isLoading ? "Czekam na odpowiedź..." : "Zapytaj Neural Engine..."}
                        className="w-full bg-[#0b0f1a] border border-slate-800 rounded-xl py-3 pl-5 pr-12 min-h-[50px] max-h-[150px] resize-y focus:outline-none focus:border-purple-500/50 transition-all text-slate-300 shadow-xl font-sans leading-relaxed"
                        disabled={isLoading}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    {isLoading && (
                        <Loader2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" />
                    )}
                </div>
                <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="flex items-center justify-center w-12 h-12 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-full transition-all shadow-lg shadow-purple-500/20"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default NeuralConsole;