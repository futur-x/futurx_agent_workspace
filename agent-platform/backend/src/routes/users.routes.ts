import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
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

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            generations: true,
            uploads: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            generations: true,
            uploads: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError('用户未找到', 404);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = Joi.object({
      username: Joi.string().min(3).max(50).required(),
      password: Joi.string().min(6).required(),
      role: Joi.string().valid('admin', 'user').default('user')
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { username, password, role } = value;

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      throw new AppError('用户名已存在', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
        isActive: true
      },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const schema = Joi.object({
      password: Joi.string().min(6),
      role: Joi.string().valid('admin', 'user'),
      isActive: Joi.boolean()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const updateData: any = {};

    if (value.password) {
      updateData.password = await bcrypt.hash(value.password, 10);
    }
    if (value.role !== undefined) {
      updateData.role = value.role;
    }
    if (value.isActive !== undefined) {
      updateData.isActive = value.isActive;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user?.userId) {
      throw new AppError('不能删除自己的账户', 400);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new AppError('用户未找到', 404);
    }

    // Delete user (cascades to related records)
    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: '用户已删除' });
  } catch (error) {
    next(error);
  }
});

// Get user permissions (admin only)
router.get('/:id/permissions', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userAgents: {
          include: {
            agent: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        userTasks: {
          include: {
            task: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new AppError('用户未找到', 404);
    }

    // Get all agents and tasks for selection
    const allAgents = await prisma.agent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });

    const allTasks = await prisma.task.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      userId: user.id,
      username: user.username,
      role: user.role,
      assignedAgents: user.userAgents.map(ua => ua.agent),
      assignedTasks: user.userTasks.map(ut => ut.task),
      availableAgents: allAgents,
      availableTasks: allTasks
    });
  } catch (error) {
    next(error);
  }
});

// Update user permissions (admin only)
router.put('/:id/permissions', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const schema = Joi.object({
      agentIds: Joi.array().items(Joi.string()).required(),
      taskIds: Joi.array().items(Joi.string()).required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { agentIds, taskIds } = value;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new AppError('用户未找到', 404);
    }

    // Update permissions in a transaction
    await prisma.$transaction(async (tx) => {
      // Clear existing permissions
      await tx.userAgent.deleteMany({
        where: { userId: id }
      });

      await tx.userTask.deleteMany({
        where: { userId: id }
      });

      // Add new agent permissions
      if (agentIds.length > 0) {
        await tx.userAgent.createMany({
          data: agentIds.map((agentId: string) => ({
            userId: id,
            agentId
          }))
        });
      }

      // Add new task permissions
      if (taskIds.length > 0) {
        await tx.userTask.createMany({
          data: taskIds.map((taskId: string) => ({
            userId: id,
            taskId
          }))
        });
      }
    });

    res.json({ message: '权限已更新' });
  } catch (error) {
    next(error);
  }
});

// Change password (for current user)
router.post('/change-password', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    const schema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(6).required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { currentPassword, newPassword } = value;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('用户未找到', 404);
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new AppError('当前密码错误', 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: '密码已更新' });
  } catch (error) {
    next(error);
  }
});

export default router;