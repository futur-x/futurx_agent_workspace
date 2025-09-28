import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { validateAgentInput } from '../validators/agent.validator';
import { testDifyConnection } from '../services/dify.service';
import { testFastGPTConnection } from '../services/fastgpt.service';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

// List all agents (filtered by user permissions)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    let agents;

    if (userRole === 'admin') {
      // Admins can see all agents
      agents = await prisma.agent.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Regular users only see agents they have permission for
      const userAgents = await prisma.userAgent.findMany({
        where: { userId },
        include: {
          agent: true
        }
      });

      agents = userAgents.map(ua => ua.agent);
    }

    res.json({ agents });
  } catch (error) {
    next(error);
  }
});

// Get agent by ID
router.get('/:agentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentId } = req.params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new AppError('Agent not found', 404);
    }

    res.json(agent);
  } catch (error) {
    next(error);
  }
});

// Create new agent
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = validateAgentInput(req.body);

    const agent = await prisma.agent.create({
      data: {
        name: validatedData.name,
        type: validatedData.type || 'dify',
        url: validatedData.url,
        apiToken: validatedData.apiToken,
        isActive: validatedData.isActive ?? true
      }
    });

    res.status(201).json(agent);
  } catch (error) {
    next(error);
  }
});

// Validate agent connection
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type = 'dify', url, apiToken } = req.body;

    if (!url || !apiToken) {
      throw new AppError('URL and API Token are required', 400);
    }

    let isValid = false;
    if (type === 'fastgpt') {
      isValid = await testFastGPTConnection(url, apiToken);
    } else {
      isValid = await testDifyConnection(url, apiToken);
    }

    res.json({
      valid: isValid,
      message: isValid ? 'Connection successful' : 'Connection failed'
    });
  } catch (error) {
    next(error);
  }
});

// Update agent
router.put('/:agentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentId } = req.params;
    const updates = req.body;

    // Check if agent exists
    const existingAgent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!existingAgent) {
      throw new AppError('Agent not found', 404);
    }

    // Validate update data
    const validatedData = validateAgentInput({ ...existingAgent, ...updates });

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        name: validatedData.name,
        type: validatedData.type || 'dify',
        url: validatedData.url,
        apiToken: validatedData.apiToken,
        isActive: validatedData.isActive
      }
    });

    res.json(agent);
  } catch (error) {
    next(error);
  }
});

// Delete agent
router.delete('/:agentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentId } = req.params;

    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new AppError('Agent not found', 404);
    }

    await prisma.agent.delete({
      where: { id: agentId }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;