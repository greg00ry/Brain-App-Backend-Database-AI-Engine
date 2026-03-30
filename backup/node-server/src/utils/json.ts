export function cleanAndParseJSON(content: string) {
  let clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');

  if (start !== -1 && end !== -1) {
    clean = clean.substring(start, end + 1);
  }

  clean = clean.replace(/,(\s*[}\]])/g, '$1');
  clean = clean.replace(/\/\/.*$/gm, '');
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');

  try {
    return JSON.parse(clean);
  } catch {
    console.error("❌ [JSON] Parse failed:", clean);
    return null;
  }
}
