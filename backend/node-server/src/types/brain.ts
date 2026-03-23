// ═══════════════════════════════════════════════════════════════════════════════
// SHARED BRAIN DOMAIN TYPES
// Kept here to avoid circular imports between conscious.processor and adapters.
// ═══════════════════════════════════════════════════════════════════════════════

export interface TopicAnalysis {
  topic: string;
  category: string;
  entryIds: string[];
  tags: string[];
  importance: number; // 1-10
}

export interface LongTermMemoryData {
  summary: string;
  tags: string[];
}
