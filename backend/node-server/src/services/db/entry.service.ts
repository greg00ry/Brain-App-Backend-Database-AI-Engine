import { VaultEntry } from "../../models/VaultEntry.js";
import { AIAnalysis } from "../ai/analyze.service.js";

export const saveAnalyzedEntry = async (userId: string, rawText: string, analysis: AIAnalysis) => {
    const entry = new VaultEntry({
        userId,
        rawText,
        ...analysis
    })
    return await entry.save()
}

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
  const { VaultEntry } = await import("../../models/VaultEntry.js");

  console.log(`[EntryService] Updating entry ${entryId}`);

  try {
    const updatedEntry = await VaultEntry.findByIdAndUpdate(
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
  const { VaultEntry } = await import("../../models/VaultEntry.js");

  try {
    const entry = await VaultEntry.findById(entryId);
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
  const { VaultEntry } = await import("../../models/VaultEntry.js");

  try {
    const entries = await VaultEntry.find({
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
