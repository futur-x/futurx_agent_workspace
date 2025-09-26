import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { validateAgentInput } from '../validators/agent.validator';
import { testDifyConnection } from '../services/dify.service';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

// List all agents
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' }
    });

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
    const { url, apiToken } = req.body;

    if (!url || !apiToken) {
      throw new AppError('URL and API Token are required', 400);
    }

    const isValid = await testDifyConnection(url, apiToken);

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