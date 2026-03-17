import { Types } from "mongoose";
import { Synapse } from "../../models/Synapse.js";
import { IVaultEntry } from "../../models/VaultEntry.js";
import { IStorageAdapter } from "../../adapters/storage/IStorageAdapter.js";
import { MEMORY } from "../../config/constants.js";

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

// ─── Recursive Synaptic Tree (3x3) ───────────────────────────────────────────

export async function getSynapticTree(
  startEntryId: string,
  depth = 1,
  visited: Set<string> = new Set(),
  currentLevel = 1
): Promise<SynapseNode[]> {
  if (depth > MEMORY.SYNAPSE_TREE_DEPTH || visited.has(startEntryId)) return [];

  visited.add(startEntryId);

  try {
    const synapses = await Synapse.find({ from: new Types.ObjectId(startEntryId) })
      .sort({ weight: -1 })
      .limit(MEMORY.SYNAPSE_BRANCH_FACTOR)
      .populate('to', 'analysis.summary analysis.tags rawText')
      .lean();

    if (synapses.length === 0) return [];

    const nodes: SynapseNode[] = [];

    for (const synapse of synapses) {
      const targetEntry = synapse.to as any;
      const targetId = targetEntry._id.toString();
      const summary = targetEntry.analysis?.summary
        || targetEntry.rawText?.substring(0, MEMORY.RAW_TEXT_PREVIEW_LENGTH)
        || 'Brak opisu';

      const children = await getSynapticTree(targetId, depth - 1, visited, currentLevel + 1);

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

// ─── Format Synaptic Tree ─────────────────────────────────────────────────────

export function formatSynapticTree(nodes: SynapseNode[], indent = ''): string {
  if (nodes.length === 0) return '';

  let formatted = '';

  nodes.forEach((node, idx) => {
    const isLast = idx === nodes.length - 1;
    const prefix = indent + (isLast ? '└─' : '├─');
    const weight = (node.weight * 10).toFixed(1);

    formatted += `${prefix} [Lvl ${node.level}] ${node.reason} → "${node.summary}" (Waga: ${weight}/10)\n`;

    if (node.children.length > 0) {
      const childIndent = indent + (isLast ? '   ' : '│  ');
      formatted += formatSynapticTree(node.children, childIndent);
    }
  });

  return formatted;
}

// ─── Get Brain Context ────────────────────────────────────────────────────────

export async function getBrainContext(
  userId: string | Types.ObjectId,
  userText: string,
  storage: IStorageAdapter
): Promise<{
  relevantEntries: IVaultEntry[];
  synapticTree: string;
  hasContext: boolean;
}> {
  try {
    const keywords = extractKeywords(userText);

    if (keywords.length === 0) {
      return { relevantEntries: [], synapticTree: '💭 Brak słów kluczowych do wyszukania.\n', hasContext: false };
    }

    const entries = await storage.findRelevantEntries(userId, keywords);

    if (entries.length === 0) {
      return { relevantEntries: [], synapticTree: '💭 Brak relevantnych wspomnień w bazie.\n', hasContext: false };
    }

    let synapticTreeFormatted = '🧠 DRZEWO SYNAPTYCZNE (3x3 Branching):\n\n';

    for (const entry of entries) {
      const entryId = entry._id.toString();
      const summary = entry.analysis?.summary || entry.rawText.substring(0, 60);

      synapticTreeFormatted += `📍 START: "${summary}"\n`;

      const tree = await getSynapticTree(entryId, MEMORY.SYNAPSE_TREE_DEPTH);
      synapticTreeFormatted += tree.length > 0
        ? formatSynapticTree(tree)
        : '   (brak połączeń)\n';

      synapticTreeFormatted += '\n';
    }

    return { relevantEntries: entries, synapticTree: synapticTreeFormatted, hasContext: true };
  } catch (error) {
    console.error('[ContextService] Error getting brain context:', error);
    return { relevantEntries: [], synapticTree: '⚠️ Błąd podczas pobierania kontekstu.\n', hasContext: false };
  }
}

// ─── Keyword Extraction ───────────────────────────────────────────────────────

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
