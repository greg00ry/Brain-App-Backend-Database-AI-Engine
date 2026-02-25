import { Types } from "mongoose";
import { VaultEntry, IVaultEntry } from "../../models/VaultEntry.js";
import { Synapse, ISynapse } from "../../models/Synapse.js";

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT CONTEXT SERVICE - Memory & Synapse Access for Jarvis
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContextResult {
  relevantEntries: IVaultEntry[];
  relevantSynapses: ISynapse[];
  formattedContext: string;
  hasContext: boolean;
}

// ─── Keyword Extraction ──────────────────────────────────────────────────────

/**
 * Ekstraktuje kluczowe słowa z tekstu użytkownika
 * Usuwa stop words i zwraca najważniejsze słowa
 */
function extractKeywords(text: string): string[] {
  // Stop words (polskie + angielskie)
  const stopWords = new Set([
    'i', 'a', 'o', 'w', 'z', 'na', 'do', 'po', 'że', 'się', 'od', 'przez',
    'dla', 'przy', 'za', 'przed', 'jak', 'co', 'który', 'ale', 'czy', 'to',
    'jest', 'był', 'będzie', 'ma', 'może', 'mój', 'twój', 'jego', 'jej',
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can'
  ]);

  // Normalizacja i podział
  const words = text
    .toLowerCase()
    .replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]/g, ' ') // Zachowaj polskie znaki
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Zwróć unikalne słowa
  return [...new Set(words)];
}

// ─── Search Relevant Entries ─────────────────────────────────────────────────

/**
 * Wyszukuje relevantne wpisy w VaultEntry bazując na słowach kluczowych
 */
async function searchRelevantEntries(
  userId: Types.ObjectId | string,
  keywords: string[],
  limit = 10
): Promise<IVaultEntry[]> {
  if (keywords.length === 0) return [];

  try {
    // Szukamy po:
    // 1. Tags (najwyższy priorytet)
    // 2. Summary
    // 3. RawText
    const entries = await VaultEntry.find({
      userId,
      $or: [
        { 'analysis.tags': { $in: keywords } },
        { 'analysis.summary': { $regex: keywords.join('|'), $options: 'i' } },
        { rawText: { $regex: keywords.join('|'), $options: 'i' } },
      ],
    })
      .sort({ 'analysis.strength': -1, lastActivityAt: -1 }) // Najsilniejsze i najnowsze
      .limit(limit)
      .lean();

    return entries as IVaultEntry[];
  } catch (error) {
    console.error('[ContextService] Error searching entries:', error);
    return [];
  }
}

// ─── Search Relevant Synapses ────────────────────────────────────────────────

/**
 * Wyszukuje relevantne synapsy dla znalezionych wpisów
 * Zwraca synapsy z najwyższą wagą (weight)
 */
async function searchRelevantSynapses(
  entryIds: Types.ObjectId[],
  limit = 10
): Promise<ISynapse[]> {
  if (entryIds.length === 0) return [];

  try {
    // Znajdź synapsy połączone z relevantnymi wpisami
    const synapses = await Synapse.find({
      $or: [
        { from: { $in: entryIds } },
        { to: { $in: entryIds } },
      ],
    })
      .populate('from', 'analysis.summary analysis.tags')
      .populate('to', 'analysis.summary analysis.tags')
      .sort({ weight: -1 }) // Najsilniejsze połączenia
      .limit(limit)
      .lean();

    return synapses as ISynapse[];
  } catch (error) {
    console.error('[ContextService] Error searching synapses:', error);
    return [];
  }
}

// ─── Format Context ──────────────────────────────────────────────────────────

/**
 * Formatuje znaleziony kontekst w czytelny format dla AI
 */
function formatContext(
  entries: IVaultEntry[],
  synapses: ISynapse[]
): string {
  let formatted = '';

  // 1. Formatuj wpisy
  if (entries.length > 0) {
    formatted += '📚 Relevantne Wspomnienia:\n';
    entries.forEach((entry, idx) => {
      const summary = entry.analysis?.summary || entry.rawText.substring(0, 100);
      const tags = entry.analysis?.tags?.slice(0, 3).join(', ') || 'brak tagów';
      const strength = entry.analysis?.strength || 0;
      
      formatted += `${idx + 1}. [Siła: ${strength}/10] ${summary}\n`;
      formatted += `   Tagi: ${tags}\n`;
      
      // Dodaj fakty z action tools jeśli są
      if (entry.actionTools?.search?.facts && entry.actionTools.search.facts.length > 0) {
        formatted += `   Fakty: ${entry.actionTools.search.facts.slice(0, 2).join('; ')}\n`;
      }
      
      formatted += '\n';
    });
  }

  // 2. Formatuj synapsy
  if (synapses.length > 0) {
    formatted += '🔗 Powiązania w Pamięci:\n';
    synapses.forEach((synapse, idx) => {
      // Bezpieczne wyciągnięcie danych z populated documents
      const fromEntry = synapse.from as any;
      const toEntry = synapse.to as any;
      
      const fromSummary = fromEntry?.analysis?.summary || 'Wpis A';
      const toSummary = toEntry?.analysis?.summary || 'Wpis B';
      const reason = synapse.reason || 'semantyczne podobieństwo';
      const weight = (synapse.weight * 10).toFixed(1); // Konwersja 0.0-1.0 → 0-10
      
      formatted += `${idx + 1}. [Waga: ${weight}/10] "${fromSummary}" ↔ "${toSummary}"\n`;
      formatted += `   Powód: ${reason}\n\n`;
    });
  }

  // 3. Fallback jeśli pusta pamięć
  if (entries.length === 0 && synapses.length === 0) {
    formatted = '💭 Brak relevantnych wspomnień w bazie danych.\n';
  }

  return formatted;
}

// ─── Main Service Function ───────────────────────────────────────────────────

/**
 * Główna funkcja serwisu kontekstowego
 * Wyszukuje relevantne dane z bazy i formatuje je dla AI
 */
export async function getConversationContext(
  userId: string | Types.ObjectId,
  userText: string
): Promise<ContextResult> {
  console.log('[ContextService] Searching context for user:', userId);

  try {
    // 1. Ekstraktuj słowa kluczowe
    const keywords = extractKeywords(userText);
    console.log('[ContextService] Keywords:', keywords);

    if (keywords.length === 0) {
      return {
        relevantEntries: [],
        relevantSynapses: [],
        formattedContext: '💭 Brak słów kluczowych do wyszukania.\n',
        hasContext: false,
      };
    }

    // 2. Wyszukaj relevantne wpisy
    const entries = await searchRelevantEntries(userId, keywords, 5);
    console.log('[ContextService] Found entries:', entries.length);

    // 3. Wyszukaj synapsy dla znalezionych wpisów
    const entryIds = entries.map(e => e._id);
    const synapses = await searchRelevantSynapses(entryIds, 5);
    console.log('[ContextService] Found synapses:', synapses.length);

    // 4. Formatuj kontekst
    const formattedContext = formatContext(entries, synapses);

    return {
      relevantEntries: entries,
      relevantSynapses: synapses,
      formattedContext,
      hasContext: entries.length > 0 || synapses.length > 0,
    };
  } catch (error) {
    console.error('[ContextService] Error getting context:', error);
    
    // Fallback - zawsze zwracamy poprawną strukturę
    return {
      relevantEntries: [],
      relevantSynapses: [],
      formattedContext: '⚠️ Błąd podczas wyszukiwania kontekstu.\n',
      hasContext: false,
    };
  }
}

// ─── Helper: Get Recent Entries ──────────────────────────────────────────────

/**
 * Pobiera ostatnie wpisy użytkownika (dla ogólnego kontekstu)
 */
export async function getRecentEntries(
  userId: string | Types.ObjectId,
  limit = 5
): Promise<IVaultEntry[]> {
  try {
    const entries = await VaultEntry.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return entries as IVaultEntry[];
  } catch (error) {
    console.error('[ContextService] Error getting recent entries:', error);
    return [];
  }
}
