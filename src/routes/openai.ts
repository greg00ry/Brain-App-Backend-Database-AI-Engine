import { Router, Request, Response } from 'express';

const router = Router();

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

// GET /v1/models - List available models
router.get('/models', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/v1/models`);
    
    if (!response.ok) {
      throw new Error('LM Studio not available');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(503).json({ 
      error: 'LM Studio not available. Make sure it is running on ' + LM_STUDIO_URL 
    });
  }
});

// POST /v1/chat/completions - Chat completions (main endpoint)
router.post('/chat/completions', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LM Studio error:', errorText);
      throw new Error('LM Studio request failed');
    }

    // Check if streaming
    if (req.body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value));
        }
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('Error in chat completions:', error);
    res.status(503).json({ 
      error: 'LM Studio not available. Make sure it is running on ' + LM_STUDIO_URL 
    });
  }
});

// POST /v1/completions - Text completions (legacy)
router.post('/completions', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/v1/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      throw new Error('LM Studio request failed');
    }

    // Check if streaming
    if (req.body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value));
        }
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('Error in completions:', error);
    res.status(503).json({ 
      error: 'LM Studio not available. Make sure it is running on ' + LM_STUDIO_URL 
    });
  }
});

// POST /v1/embeddings - Generate embeddings
router.post('/embeddings', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      throw new Error('LM Studio request failed');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in embeddings:', error);
    res.status(503).json({ 
      error: 'LM Studio not available. Make sure it is running on ' + LM_STUDIO_URL 
    });
  }
});

// POST /v1/responses - Responses API (if supported by LM Studio)
router.post('/responses', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      // Fallback to chat/completions if responses not supported
      console.log('Responses API not supported, falling back to chat/completions');
      
      const chatResponse = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: req.body.model || 'local-model',
          messages: [{ role: 'user', content: req.body.input || req.body.prompt }],
          ...req.body,
        }),
      });

      if (!chatResponse.ok) {
        throw new Error('LM Studio request failed');
      }

      const data = await chatResponse.json();
      res.json(data);
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in responses:', error);
    res.status(503).json({ 
      error: 'LM Studio not available. Make sure it is running on ' + LM_STUDIO_URL 
    });
  }
});

export default router;
