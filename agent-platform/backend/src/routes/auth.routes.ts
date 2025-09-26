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
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError('用户名和密码都是必需的', 400);
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || !user.isActive) {
      throw new AppError('用户名或密码错误', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new AppError('用户名或密码错误', 401);
    }

    // Create session
    const sessionId = uuidv4();
    const secret = process.env.JWT_SECRET || 'default-secret';
    const expiryTime = process.env.SESSION_EXPIRY || '30m';

    const token = jwt.sign({
      sessionId,
      userId: user.id,
      username: user.username,
      role: user.role
    }, secret, { expiresIn: expiryTime });

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // Save session to database with userId
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        token,
        expiresAt
      }
    });

    res.json({
      token,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
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
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      }
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Session expired', 401);
    }

    res.json({
      valid: true,
      user: session.user,
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