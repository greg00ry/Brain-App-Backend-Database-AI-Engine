



//Ochrona dla nieprawidlowego jsona

export function cleanAndParseJSON(content: string){
  let clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  
  if (start !== -1 && end !== -1) {
    clean = clean.substring(start, end + 1);
  }
  
  clean = clean.replace(/,(\s*[}\]])/g, '$1')
  clean = clean.replace(/\/\/.*$/gm, '')
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, '')

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("❌ [JSON FIX] Cleaned: ", clean);
    return null;
  }
}



const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';


export interface ICallLMStudio {
    prompt: string,
    content: string,
    temperature: number,
    max_tokens: number
}


export async function callLMStudio(template: ICallLMStudio) {
   const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'local-model',
        messages: [
          { role: 'system', content: template.content },
          { role: 'user', content: template.prompt },
        ],
        temperature: template.temperature,
        max_tokens: template.max_tokens, // Reduced
      }),
    });
    return response
}