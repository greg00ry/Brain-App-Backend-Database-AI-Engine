import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { User, IUser } from '../models/User.js';
import { JWT_SECRET } from '../config/passport.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Generate JWT token
const generateToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const user = new User({ email, password, name });
    await user.save();

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', { session: false }, (err: Error, user: IUser, info: { message: string }) => {
    if (err) {
      return res.status(500).json({ error: 'Login failed' });
    }

    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  })(req, res, next);
});

// Get current user
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as AuthRequest).user!;
  
  res.json({
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
    },
  });
});

// Logout (client-side - just removes token)
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

router.post("/verify", (req: Request, res: Response) => {
   const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    res.status(200).json({
      message: 'Token is valid',
      user: decoded, // Zwracamy dane użytkownika zakodowane w tokenie
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
})

export default router;
