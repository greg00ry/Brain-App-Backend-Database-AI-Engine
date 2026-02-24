import mongoose from "mongoose";

// ─── Schema Extension ─────────────────────────────────────────────────────────

/**
 * Rozszerzenie istniejącego Entry Schema o pole actionTools
 * Dodaj to do swojego głównego Entry schema:
 * 
 * const EntrySchema = new mongoose.Schema({
 *   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
 *   rawText: { type: String, required: true },
 *   analysis: {
 *     summary: String,
 *     tags: [String],
 *     strength: Number,
 *     category: String,
 *     isProcessed: Boolean
 *   },
 *   actionTools: {               // ← DODAJ TO POLE
 *     search: {
 *       completed: Boolean,
 *       facts: [String],
 *       searchResults: String,
 *       sources: [String],
 *       timestamp: Date
 *     },
 *     email: {
 *       completed: Boolean,
 *       sent: Boolean,
 *       messageId: String,
 *       timestamp: Date
 *     }
 *   },
 *   createdAt: { type: Date, default: Date.now }
 * });
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionToolsData {
  search?: {
    completed: boolean;
    facts?: string[];
    searchResults?: string;
    sources?: string[];
    timestamp?: Date;
  };
  email?: {
    completed: boolean;
    sent?: boolean;
    messageId?: string;
    timestamp?: Date;
  };
}

// ─── Update Function ──────────────────────────────────────────────────────────

/**
 * Aktualizuje istniejący wpis w bazie danych
 * @param entryId - ID wpisu do aktualizacji
 * @param updateData - Dane do aktualizacji (może zawierać nested fields)
 * @returns Zaktualizowany wpis
 */
export async function updateEntry(
  entryId: string,
  updateData: Record<string, any>
): Promise<any> {
  
  // Dynamiczny import modelu (zastąp ścieżką do swojego modelu)
  const { Entry } = await import("../models/Entry.model.js");

  console.log(`[EntryService] Updating entry ${entryId}`);

  try {
    const updatedEntry = await Entry.findByIdAndUpdate(
      entryId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      throw new Error(`Entry ${entryId} not found`);
    }

    console.log(`[EntryService] ✓ Entry ${entryId} updated successfully`);
    return updatedEntry;
  } catch (error) {
    console.error(`[EntryService] ✗ Failed to update entry ${entryId}:`, error);
    throw error;
  }
}

/**
 * Pobiera wpis z bazy danych
 * @param entryId - ID wpisu
 * @returns Wpis lub null
 */
export async function getEntryById(entryId: string): Promise<any | null> {
  const { Entry } = await import("../models/Entry.model.js");

  try {
    const entry = await Entry.findById(entryId);
    return entry;
  } catch (error) {
    console.error(`[EntryService] ✗ Failed to get entry ${entryId}:`, error);
    return null;
  }
}

/**
 * Pobiera wszystkie wpisy użytkownika z action tools
 * @param userId - ID użytkownika
 * @returns Lista wpisów
 */
export async function getEntriesWithActionTools(userId: string): Promise<any[]> {
  const { Entry } = await import("../models/Entry.model.js");

  try {
    const entries = await Entry.find({
      userId,
      $or: [
        { "actionTools.search.completed": true },
        { "actionTools.email.completed": true },
      ],
    }).sort({ createdAt: -1 });

    return entries;
  } catch (error) {
    console.error(`[EntryService] ✗ Failed to get entries:`, error);
    return [];
  }
}
