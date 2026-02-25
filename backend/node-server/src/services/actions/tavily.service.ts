import axios from "axios";

// ─── Config ───────────────────────────────────────────────────────────────────

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_API_URL = "https://api.tavily.com/search";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TavilySearchParams {
  query: string;
  search_depth?: "basic" | "advanced";
  max_results?: number;
  include_domains?: string[];
  exclude_domains?: string[];
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  query: string;
  results: TavilyResult[];
  response_time: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Wykonuje research w sieci przez Tavily API
 * @param params - Parametry wyszukiwania
 * @returns Wyniki wyszukiwania z internetu
 */
export async function searchWithTavily(
  params: TavilySearchParams
): Promise<TavilyResponse> {
  
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const TAVILY_API_URL = "https://api.tavily.com/search";

  if (!TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY not configured in environment");
  }

  console.log(`[TavilyService] Searching: "${params.query}"`);

  try {
    const response = await axios.post<TavilyResponse>(
      TAVILY_API_URL,
      {
        api_key: TAVILY_API_KEY,
        query: params.query,
        search_depth: params.search_depth || "basic",
        max_results: params.max_results || 5,
        include_domains: params.include_domains || [],
        exclude_domains: params.exclude_domains || [],
        include_answer: true,
        include_raw_content: false,
      },
      {
        timeout: 30000, // 30 sekund timeout
      }
    );

    console.log(
      `[TavilyService] ✓ Found ${response.data.results.length} results in ${response.data.response_time}ms`
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        `[TavilyService] ✗ API Error: ${error.response?.status} - ${error.message}`
      );
      throw new Error(
        `Tavily API error: ${error.response?.data?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Formatuje wyniki Tavily do krótkiego podsumowania
 * @param results - Wyniki z Tavily
 * @returns Sformatowane fakty do zapisania w bazie
 */
export function formatTavilyResults(results: TavilyResult[]): string {
  if (results.length === 0) {
    return "Brak wyników wyszukiwania.";
  }

  let formatted = "🔍 Wyniki researchu:\n\n";

  results.forEach((result, index) => {
    formatted += `${index + 1}. ${result.title}\n`;
    formatted += `   ${result.content.substring(0, 200)}...\n`;
    formatted += `   🔗 ${result.url}\n\n`;
  });

  return formatted;
}

/**
 * Ekstraktuje najważniejsze fakty z wyników Tavily
 * @param results - Wyniki z Tavily
 * @returns Lista kluczowych faktów
 */
export function extractKeyFacts(results: TavilyResult[]): string[] {
  const facts: string[] = [];

  results.forEach((result) => {
    // Wyciągamy pierwsze 2-3 zdania z contentu każdego wyniku
    const sentences = result.content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    
    sentences.slice(0, 2).forEach((sentence) => {
      facts.push(`${sentence.trim()}.`);
    });
  });

  return facts.slice(0, 10); // Max 10 faktów
}
