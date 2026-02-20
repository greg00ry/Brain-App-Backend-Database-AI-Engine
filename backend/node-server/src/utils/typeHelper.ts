import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';

// Generyczny wrapper dla Twoich kontrolerów
export const asyncHandler = (
  fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Tutaj robimy bezpieczne rzutowanie TYLKO w tym jednym miejscu
    fn(req as AuthRequest, res, next).catch(next);
  };
};