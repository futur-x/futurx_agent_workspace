import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import Joi from 'joi';

const router = Router();
const prisma = new PrismaClient();

// Middleware to check if user is admin
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    throw new AppError('需要管理员权限', 403);
  }
  next();
};

// Get system config by key
router.get('/:key', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;

    const config = await prisma.systemConfig.findUnique({
      where: { key }
    });

    if (!config) {
      // Return default config if not found
      return res.json({
        config: {
          key,
          value: null,
          exists: false
        }
      });
    }

    res.json({
      config: {
        ...config,
        value: JSON.parse(config.value),
        exists: true
      }
    });
  } catch (error) {
    next(error);
  }
});

// Set or update system config
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = Joi.object({
      key: Joi.string().required(),
      value: Joi.object().required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { key, value: configValue } = value;

    const config = await prisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value: JSON.stringify(configValue)
      },
      update: {
        value: JSON.stringify(configValue)
      }
    });

    res.json({
      config: {
        ...config,
        value: JSON.parse(config.value)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete system config
router.delete('/:key', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;

    await prisma.systemConfig.delete({
      where: { key }
    });

    res.json({ message: '配置已删除' });
  } catch (error) {
    next(error);
  }
});

export default router;
