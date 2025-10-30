import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import Joi from 'joi';
import { searchKnowledgeBase } from '../services/knowledgeBase.service';

const router = Router();
const prisma = new PrismaClient();

// Middleware to check if user is admin
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    throw new AppError('需要管理员权限', 403);
  }
  next();
};

// Get all knowledge bases (with permission filter)
router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: isAdmin
        ? {} // Admin sees all
        : {
            OR: [
              { createdBy: userId }, // User's own knowledge bases
              {
                userKnowledgeBases: {
                  some: { userId }
                }
              } // Knowledge bases shared with user
            ]
          },
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        },
        userKnowledgeBases: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        _count: {
          select: {
            generationKnowledges: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Remove sensitive config data from response
    const sanitizedData = knowledgeBases.map((kb) => ({
      ...kb,
      config: undefined, // Don't expose config in list view
      configPreview: {
        type: kb.type,
        hasConfig: !!kb.config
      }
    }));

    res.json({ knowledgeBases: sanitizedData });
  } catch (error) {
    next(error);
  }
});

// Get single knowledge base detail
router.get('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        },
        userKnowledgeBases: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    if (!knowledgeBase) {
      throw new AppError('知识库未找到', 404);
    }

    // Check permission
    const hasPermission =
      isAdmin ||
      knowledgeBase.createdBy === userId ||
      knowledgeBase.userKnowledgeBases.some((ukb) => ukb.userId === userId);

    if (!hasPermission) {
      throw new AppError('无权访问此知识库', 403);
    }

    res.json({ knowledgeBase });
  } catch (error) {
    next(error);
  }
});

// Create knowledge base
router.post('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).required(),
      description: Joi.string().allow('').optional(),
      type: Joi.string().valid('fastgpt', 'dify').required(),
      config: Joi.object().required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { name, description, type, config } = value;
    const userId = req.user?.userId!;

    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name,
        description,
        type,
        config: JSON.stringify(config),
        createdBy: userId
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    res.status(201).json({ knowledgeBase });
  } catch (error) {
    next(error);
  }
});

// Update knowledge base
router.put('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    const schema = Joi.object({
      name: Joi.string().min(1).max(100),
      description: Joi.string().allow(''),
      config: Joi.object(),
      isActive: Joi.boolean()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    // Check permission
    const existing = await prisma.knowledgeBase.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new AppError('知识库未找到', 404);
    }

    if (!isAdmin && existing.createdBy !== userId) {
      throw new AppError('无权修改此知识库', 403);
    }

    const updateData: any = {};
    if (value.name) updateData.name = value.name;
    if (value.description !== undefined) updateData.description = value.description;
    if (value.config) updateData.config = JSON.stringify(value.config);
    if (value.isActive !== undefined) updateData.isActive = value.isActive;

    const knowledgeBase = await prisma.knowledgeBase.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    res.json({ knowledgeBase });
  } catch (error) {
    next(error);
  }
});

// Delete knowledge base
router.delete('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id }
    });

    if (!knowledgeBase) {
      throw new AppError('知识库未找到', 404);
    }

    if (!isAdmin && knowledgeBase.createdBy !== userId) {
      throw new AppError('无权删除此知识库', 403);
    }

    await prisma.knowledgeBase.delete({
      where: { id }
    });

    res.json({ message: '知识库已删除' });
  } catch (error) {
    next(error);
  }
});

// Test knowledge base connection
router.post(
  '/:id/test',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const isAdmin = req.user?.role === 'admin';

      const knowledgeBase = await prisma.knowledgeBase.findUnique({
        where: { id }
      });

      if (!knowledgeBase) {
        throw new AppError('知识库未找到', 404);
      }

      // Check permission
      const hasPermission =
        isAdmin ||
        knowledgeBase.createdBy === userId ||
        (await prisma.userKnowledgeBase.findFirst({
          where: { userId, knowledgeBaseId: id }
        }));

      if (!hasPermission) {
        throw new AppError('无权访问此知识库', 403);
      }

      const config = JSON.parse(knowledgeBase.config);
      const testQuery = '测试';

      const results = await searchKnowledgeBase(knowledgeBase.type, config, testQuery);

      res.json({
        success: true,
        message: '连接成功',
        resultsCount: results.length
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get knowledge base permissions
router.get(
  '/:id/permissions',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const knowledgeBase = await prisma.knowledgeBase.findUnique({
        where: { id },
        include: {
          userKnowledgeBases: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  role: true
                }
              }
            }
          }
        }
      });

      if (!knowledgeBase) {
        throw new AppError('知识库未找到', 404);
      }

      // Get all users
      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          username: true,
          role: true
        },
        orderBy: { username: 'asc' }
      });

      res.json({
        knowledgeBaseId: knowledgeBase.id,
        knowledgeBaseName: knowledgeBase.name,
        assignedUsers: knowledgeBase.userKnowledgeBases.map((ukb) => ukb.user),
        availableUsers: allUsers
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update knowledge base permissions
router.put(
  '/:id/permissions',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const schema = Joi.object({
        userIds: Joi.array().items(Joi.string()).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }

      const { userIds } = value;

      const knowledgeBase = await prisma.knowledgeBase.findUnique({
        where: { id }
      });

      if (!knowledgeBase) {
        throw new AppError('知识库未找到', 404);
      }

      // Update permissions in transaction
      await prisma.$transaction(async (tx) => {
        // Clear existing permissions
        await tx.userKnowledgeBase.deleteMany({
          where: { knowledgeBaseId: id }
        });

        // Add new permissions
        if (userIds.length > 0) {
          await tx.userKnowledgeBase.createMany({
            data: userIds.map((userId: string) => ({
              userId,
              knowledgeBaseId: id
            }))
          });
        }
      });

      res.json({ message: '权限已更新' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
