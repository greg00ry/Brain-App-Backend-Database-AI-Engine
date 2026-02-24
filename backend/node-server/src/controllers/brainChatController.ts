import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';

export const streamBrainResponse = async (req: AuthRequest, res: Response) => {
    
  
    try {
    const { messages } = req.body; // Wiadomości z Twojego gotowego frontu

    // 1. Ustawiamy nagłówki pod Streaming (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 2. Tu docelowo będzie fetch do Twojego Pythona
    // Na razie symulujemy most, żebyś mógł sprawdzić Front
    
    // TODO: Zastąpić adresem Twojego serwera Python
    const PYTHON_ENGINE_URL = "http://localhost:5001/chat"; 

    const response = await fetch(PYTHON_ENGINE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: req.user!._id,
        messages: messages,
        // Tu później wstrzykniemy Attention z categories
      }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error('Brak streamu z silnika AI');

    // 3. Pętla przesyłająca dane "na żywo" do frontu
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      
      // Wysyłamy chunk bezpośrednio do Twojego opakowania na froncie
      res.write(chunk); 
    }

    res.end();

  } catch (error) {
    console.error('Streaming Error:', error);
    res.write('data: {"error": "Połączenie z Mózgiem przerwane..."}\n\n');
    res.end();
  }
};


