import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { IUser } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: IUser) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - Please log in' });
    }

    (req as AuthRequest).user = user;
    next();
  })(req, res, next);
};
