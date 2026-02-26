import { Types } from "mongoose";
import { Synapse, ISynapse } from "../../models/Synapse.js";
import { VaultEntry, IVaultEntry } from "../../models/VaultEntry.js";

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT CONTEXT SERVICE - Recursive Branching Retrieval (3x3)
// ═══════════════════════════════════════════════════════════════════════════════

interface SynapseNode {
  entryId: string;
  summary: string;
  weight: number;
  reason: string;
  level: number;
  children: SynapseNode[];
}

// ─── Recursive Synaptic Tree (3x3) ──────────────────────────────────────────

/**
 * Pobiera drzewo synaps rekurencyjnie (depth = 3, branching = 3)
 * Dla każdego węzła pobiera 3 najcięższe synapsy i schodzi w głąb
 * 
 * @param startEntryId - ID początkowego wpisu
 * @param depth - Głębokość rekurencji (default: 1, max: 3)
 * @param visited - Set odwiedzonych ID (zapobiega cyklom)
 * @param currentLevel - Aktualny poziom (dla formatowania)
 */
export async function getSynapticTree(
  startEntryId: string,
  depth = 1,
  visited: Set<string> = new Set(),
  currentLevel = 1
): Promise<SynapseNode[]> {
  // Warunek zatrzymania: osiągnięto max depth lub już odwiedzono
  if (depth > 3 || visited.has(startEntryId)) {
    return [];
  }

  // Oznacz jako odwiedzony
  visited.add(startEntryId);

  try {
    // Pobierz 3 najcięższe synapsy dla tego węzła
    const synapses = await Synapse.find({
      from: new Types.ObjectId(startEntryId),
    })
      .sort({ weight: -1 }) // Najcięższe najpierw
      .limit(3)              // Top 3 tylko
      .populate('to', 'analysis.summary analysis.tags rawText') // Populate target entry
      .lean();

    if (synapses.length === 0) {
      return []; // Liść - brak dalszych połączeń
    }

    // Buduj węzły dla każdej synapsy
    const nodes: SynapseNode[] = [];

    for (const synapse of synapses) {
      const targetEntry = synapse.to as any; // Populated document
      const targetId = targetEntry._id.toString();

      // Pobierz summary (fallback na rawText)
      const summary = targetEntry.analysis?.summary 
        || targetEntry.rawText?.substring(0, 80) 
        || 'Brak opisu';

      // Rekurencyjnie pobierz dzieci (depth - 1)
      const children = await getSynapticTree(
        targetId,
        depth - 1,
        visited,
        currentLevel + 1
      );

      nodes.push({
        entryId: targetId,
        summary,
        weight: synapse.weight,
        reason: synapse.reason || 'semantyczne podobieństwo',
        level: currentLevel,
        children,
      });
    }

    return nodes;
  } catch (error) {
    console.error(`[ContextService] Error getting synaptic tree for ${startEntryId}:`, error);
    return [];
  }
}

// ─── Format Synaptic Tree ────────────────────────────────────────────────────

/**
 * Formatuje drzewo synaps w czytelny string z wcięciami
 * Format: [Lvl N] Powód -> Cel (Waga: X.X)
 */
export function formatSynapticTree(nodes: SynapseNode[], indent = ''): string {
  if (nodes.length === 0) return '';

  let formatted = '';

  nodes.forEach((node, idx) => {
    const isLast = idx === nodes.length - 1;
    const prefix = indent + (isLast ? '└─' : '├─');
    const weight = (node.weight * 10).toFixed(1); // 0.0-1.0 → 0-10

    formatted += `${prefix} [Lvl ${node.level}] ${node.reason} → "${node.summary}" (Waga: ${weight}/10)\n`;

    // Rekurencyjnie formatuj dzieci
    if (node.children.length > 0) {
      const childIndent = indent + (isLast ? '   ' : '│  ');
      formatted += formatSynapticTree(node.children, childIndent);
    }
  });

  return formatted;
}

// ─── Get Brain Context ───────────────────────────────────────────────────────

/**
 * Główna funkcja: pobiera kontekst mózgu dla zapytania użytkownika
 * Wyszukuje relevantne wpisy i buduje drzewo synaps
 */
export async function getBrainContext(
  userId: string | Types.ObjectId,
  userText: string
): Promise<{
  relevantEntries: IVaultEntry[];
  synapticTree: string;
  hasContext: boolean;
}> {
  console.log('[ContextService] Getting brain context for:', userText);

  try {
    // 1. Ekstraktuj słowa kluczowe
    const keywords = extractKeywords(userText);
    
    if (keywords.length === 0) {
      return {
        relevantEntries: [],
        synapticTree: '💭 Brak słów kluczowych do wyszukania.\n',
        hasContext: false,
      };
    }

    console.log('[ContextService] Keywords:', keywords);

    // 2. Wyszukaj relevantne wpisy (Top 3)
    const entries = await VaultEntry.find({
      userId,
      $or: [
        { 'analysis.tags': { $in: keywords } },
        { 'analysis.summary': { $regex: keywords.join('|'), $options: 'i' } },
        { rawText: { $regex: keywords.join('|'), $options: 'i' } },
      ],
    })
      .sort({ 'analysis.strength': -1, lastActivityAt: -1 })
      .limit(3) // Top 3 najbardziej relevantne
      .lean();

    console.log('[ContextService] Found entries:', entries.length);

    if (entries.length === 0) {
      return {
        relevantEntries: [],
        synapticTree: '💭 Brak relevantnych wspomnień w bazie.\n',
        hasContext: false,
      };
    }

    // 3. Dla każdego wpisu zbuduj drzewo synaps (3 poziomy głębokości)
    let synapticTreeFormatted = '🧠 DRZEWO SYNAPTYCZNE (3x3 Branching):\n\n';

    for (const entry of entries) {
      const entryId = entry._id.toString();
      const summary = entry.analysis?.summary || entry.rawText.substring(0, 60);
      
      synapticTreeFormatted += `📍 START: "${summary}"\n`;

      // Buduj drzewo (depth = 3)
      const tree = await getSynapticTree(entryId, 3);
      
      if (tree.length > 0) {
        synapticTreeFormatted += formatSynapticTree(tree);
      } else {
        synapticTreeFormatted += '   (brak połączeń)\n';
      }
      
      synapticTreeFormatted += '\n';
    }

    return {
      relevantEntries: entries as unknown as IVaultEntry[],
      synapticTree: synapticTreeFormatted,
      hasContext: true,
    };
  } catch (error) {
    console.error('[ContextService] Error getting brain context:', error);
    return {
      relevantEntries: [],
      synapticTree: '⚠️ Błąd podczas pobierania kontekstu.\n',
      hasContext: false,
    };
  }
}

// ─── Keyword Extraction ──────────────────────────────────────────────────────

/**
 * Ekstraktuje kluczowe słowa z tekstu (usuwa stop words)
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'i', 'a', 'o', 'w', 'z', 'na', 'do', 'po', 'że', 'się', 'od', 'przez',
    'dla', 'przy', 'za', 'przed', 'jak', 'co', 'który', 'ale', 'czy', 'to',
    'jest', 'był', 'będzie', 'ma', 'może', 'mój', 'twój', 'jego', 'jej',
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  return [...new Set(words)];
}
