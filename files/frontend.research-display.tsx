// ═══════════════════════════════════════════════════════════════════════════════
// FRONTEND EXAMPLE - Display Research Results
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  facts?: string[];     // ← Research results
  sources?: string[];   // ← Sources
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    // 1. Dodaj wiadomość użytkownika
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // 2. Wywołaj SSE endpoint
      const response = await fetch('/api/intent/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let aiMessage: Message | null = null;

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const data = JSON.parse(line.substring(6));

          // ═══════════════════════════════════════════════════════════════════
          // Obsługa różnych stagów
          // ═══════════════════════════════════════════════════════════════════

          if (data.stage === 'answer') {
            // 3. Odpowiedź Jarvisa
            aiMessage = {
              id: `ai-${Date.now()}`,
              text: data.content.replace('📝 ', ''),
              sender: 'ai',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiMessage!]);
          }

          if (data.stage === 'results' && data.status === 'complete') {
            // 4. Wyniki researchu - DODAJ DO AI MESSAGE!
            if (aiMessage && data.data?.facts) {
              aiMessage.facts = data.data.facts;
              aiMessage.sources = data.data.sources;
              
              setMessages(prev => {
                const updated = [...prev];
                const idx = updated.findIndex(m => m.id === aiMessage!.id);
                if (idx !== -1) {
                  updated[idx] = { ...aiMessage! };
                }
                return updated;
              });
            }
          }

          if (data.stage === 'complete') {
            setIsProcessing(false);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setIsProcessing(false);
    }
  }, []);

  return { messages, sendMessage, isProcessing };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE COMPONENT - Display with Facts
// ═══════════════════════════════════════════════════════════════════════════════

interface MessageProps {
  message: Message;
}

export function MessageBubble({ message }: MessageProps) {
  if (message.sender === 'user') {
    return (
      <div className="message user">
        <div className="bubble">{message.text}</div>
      </div>
    );
  }

  // AI message z opcjonalnymi wynikami researchu
  return (
    <div className="message ai">
      <div className="bubble">
        {message.text}
        
        {/* Wyniki researchu (jeśli są) */}
        {message.facts && message.facts.length > 0 && (
          <div className="research-results">
            <div className="results-header">🔍 Znalazłem:</div>
            <ul className="facts-list">
              {message.facts.map((fact, idx) => (
                <li key={idx}>{fact}</li>
              ))}
            </ul>
            
            {message.sources && message.sources.length > 0 && (
              <div className="sources">
                <div className="sources-header">📚 Źródła:</div>
                <ul className="sources-list">
                  {message.sources.map((source, idx) => (
                    <li key={idx}>
                      <a href={source} target="_blank" rel="noopener noreferrer">
                        {new URL(source).hostname}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════════

const styles = `
.message.ai .research-results {
  margin-top: 12px;
  padding: 12px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border-left: 3px solid #6366f1;
}

.results-header {
  font-weight: 600;
  margin-bottom: 8px;
  color: #6366f1;
}

.facts-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.facts-list li {
  padding: 6px 0;
  padding-left: 20px;
  position: relative;
}

.facts-list li:before {
  content: "•";
  position: absolute;
  left: 0;
  color: #6366f1;
  font-weight: bold;
}

.sources {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(99, 102, 241, 0.2);
}

.sources-header {
  font-size: 0.9em;
  font-weight: 600;
  margin-bottom: 6px;
  color: #6366f1;
}

.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sources-list li {
  font-size: 0.85em;
  padding: 3px 0;
}

.sources-list a {
  color: #6366f1;
  text-decoration: none;
}

.sources-list a:hover {
  text-decoration: underline;
}
`;
