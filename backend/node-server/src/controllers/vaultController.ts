import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { storageAdapter } from '../services/db/storage.js';

export const getUnifiedVault = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { entries, memories, categories } = await storageAdapter.getVaultData(userId);
    res.json({ synapses: entries, memories, categories });
  } catch (error) {
    res.status(500).json({ message: "Błąd agregacji Vaulta" });
  }
};

export const deleteVaultEntry = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const entry = await storageAdapter.deleteVaultEntry(id, userId);
    if (!entry) {
      return res.status(404).json({ message: "Nie znaleziono wpisu lub brak uprawnień" });
    }
    res.json({ message: "Wpis usunięty", id });
  } catch (error) {
    res.status(500).json({ message: "Błąd usuwania wpisu" });
  }
};
