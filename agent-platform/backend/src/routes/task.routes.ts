import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { validateTaskInput, extractPlaceholders } from '../validators/task.validator';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

// List all tasks (filtered by user permissions)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    let tasks;

    if (userRole === 'admin') {
      // Admins can see all tasks
      tasks = await prisma.task.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Regular users only see tasks they have permission for
      const userTasks = await prisma.userTask.findMany({
        where: { userId },
        include: {
          task: true
        }
      });

      tasks = userTasks.map(ut => ut.task);
    }

    // Parse placeholders from JSON string
    const tasksWithParsedPlaceholders = tasks.map(task => ({
      ...task,
      placeholders: JSON.parse(task.placeholders)
    }));

    res.json({ tasks: tasksWithParsedPlaceholders });
  } catch (error) {
    next(error);
  }
});

// Get task by ID
router.get('/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    res.json({
      ...task,
      placeholders: JSON.parse(task.placeholders)
    });
  } catch (error) {
    next(error);
  }
});

// Create new task
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = validateTaskInput(req.body);
    const placeholders = extractPlaceholders(validatedData.promptTemplate);

    const task = await prisma.task.create({
      data: {
        name: validatedData.name,
        promptTemplate: validatedData.promptTemplate,
        placeholders: JSON.stringify(placeholders)
      }
    });

    res.status(201).json({
      ...task,
      placeholders
    });
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!existingTask) {
      throw new AppError('Task not found', 404);
    }

    // Validate update data
    const validatedData = validateTaskInput({ ...existingTask, ...updates });
    const placeholders = extractPlaceholders(validatedData.promptTemplate);

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        name: validatedData.name,
        promptTemplate: validatedData.promptTemplate,
        placeholders: JSON.stringify(placeholders)
      }
    });

    res.json({
      ...task,
      placeholders
    });
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete('/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;