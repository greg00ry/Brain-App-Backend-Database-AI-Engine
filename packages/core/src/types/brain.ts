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

// ─── Domain entity interfaces (framework-level, no mongoose dependency) ───────

export interface IVaultEntry {
  _id: { toString(): string };
  userId: string;
  rawText: string;
  analysis?: {
    summary: string;
    tags: string[];
    strength: number;
    category: string;
    isProcessed: boolean;
  };
  embedding?: number[];
  isAnalyzed: boolean;
  isConsolidated: boolean;
  isPermanent: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILongTermMemory {
  _id: { toString(): string };
  userId: string;
  summary: string | null;
  tags: string[];
  strength: number;
  categoryId: { toString(): string } | null;
  categoryName: string | null;
  sourceEntryIds: { toString(): string }[];
  topic: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategory {
  _id: { toString(): string };
  name: string;
  description: string;
  icon: string;
  color: string;
  keywords: string[];
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
