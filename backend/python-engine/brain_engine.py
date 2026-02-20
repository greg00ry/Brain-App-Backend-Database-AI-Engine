from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import asyncio
import json

app = FastAPI()

async def mock_brain_streaming(messages, attention_map):
    """
    Symulacja pracy mózgu. 
    Docelowo tutaj wleci logika Synaps i LTM.
    """
    response_text = "Cześć Greg! Tu Twój Mózg. "
    if attention_map:
        response_text += f"Skupiam uwagę na Twoich kategoriach: {', '.join([c['name'] for c in attention_map])}. "
    
    response_text += "Streaming działa, most jest drożny. Czekam na Twoje instrukcje w Pythonie."

    # Symulujemy generowanie słowo po słowie (tokenizacja)
    for word in response_text.split():
        yield f"data: {json.dumps({'content': word + ' '})}\n\n"
        await asyncio.sleep(0.1)  # Realistyczny lag AI

@app.post("/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    messages = data.get("messages", [])
    attention_map = data.get("attentionMap", []) # To co wyślemy z Node'a
    
    return StreamingResponse(
        mock_brain_streaming(messages, attention_map), 
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)