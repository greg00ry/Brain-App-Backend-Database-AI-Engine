import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, extname, basename } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

export function chunkText(text: string, size = 600, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size).trim());
    start += size - overlap;
  }
  return chunks.filter(c => c.length > 20);
}

export async function parsePdf(filePath: string): Promise<{ text: string; pages: number }> {
  const buffer = readFileSync(filePath);
  const data = await pdfParse(buffer);
  return { text: data.text, pages: data.numpages };
}

export function collectFiles(input: string): string[] {
  const resolved = resolve(input);
  const stat = statSync(resolved);
  if (stat.isFile()) return [resolved];
  return readdirSync(resolved)
    .filter(f => extname(f).toLowerCase() === ".pdf")
    .map(f => resolve(resolved, f));
}

export { basename };
