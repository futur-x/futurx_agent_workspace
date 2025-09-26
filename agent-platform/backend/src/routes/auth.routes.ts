import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// Login endpoint
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;

    if (!password) {
      throw new AppError('Password is required', 400);
    }

    // Check password against environment variable
    const correctPassword = process.env.ACCESS_PASSWORD || 'admin123';
    const isValid = password === correctPassword;

    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Create session
    const sessionId = uuidv4();
    const secret = process.env.JWT_SECRET || 'default-secret';
    const expiryTime = process.env.SESSION_EXPIRY || '30m';

    const token = jwt.sign({ sessionId }, secret, { expiresIn: expiryTime });

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // Save session to database
    await prisma.session.create({
      data: {
        id: sessionId,
        token,
        expiresAt
      }
    });

    res.json({
      token,
      sessionId,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.user?.sessionId;

    if (sessionId) {
      // Delete session from database
      await prisma.session.delete({
        where: { id: sessionId }
      }).catch(() => {
        // Ignore if session doesn't exist
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Check session status
router.get('/session', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.user?.sessionId;

    if (!sessionId) {
      throw new AppError('Invalid session', 401);
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Session expired', 401);
    }

    res.json({
      valid: true,
      expiresAt: session.expiresAt.toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Clean up expired sessions (run periodically)
const cleanupExpiredSessions = async () => {
  try {
    await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

export default router;