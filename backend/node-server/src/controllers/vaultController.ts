// src/controllers/vaultController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { VaultEntry } from '../models/VaultEntry.js';
import { LongTermMemory } from '../models/LongTermMemory.js';
import { Category } from '../models/Category.js';

export const getUnifiedVault = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    // Pobieramy wszystko równolegle - wydajność Pragmatycznego Architekta
    const [synapses, memories, categories] = await Promise.all([
      VaultEntry.find({ userId }).sort({ createdAt: -1 }),
      LongTermMemory.find({ userId }).populate('categoryId').sort({ createdAt: -1 }),
      Category.find({ isActive: true }).sort({ order: 1 })
    ]);

    res.json({
      synapses,   // Surowe dane (IVaultEntry)
      memories,   // Skonsolidowana wiedza (ILongTermMemory)
      categories  // Dostępne szuflady (ICategory)
    });
  } catch (error) {
    res.status(500).json({ message: "Błąd agregacji Vaulta" });
  }
};

export const deleteVaultEntry = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const entry = await VaultEntry.findOneAndDelete({ _id: id, userId });

    if (!entry) {
      return res.status(404).json({ message: "Nie znaleziono wpisu lub brak uprawnień" });
    }

    res.json({ message: "Wpis usunięty", id });
  } catch (error) {
    res.status(500).json({ message: "Błąd usuwania wpisu" });
  }
};