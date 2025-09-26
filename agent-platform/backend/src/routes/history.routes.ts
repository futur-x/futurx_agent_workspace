import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

// List generation history
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 30;
    const offset = parseInt(req.query.offset as string) || 0;

    const [history, total] = await Promise.all([
      prisma.generation.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: {
            select: {
              name: true
            }
          },
          task: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.generation.count()
    ]);

    // Create summary for each history item
    const historyWithSummary = history.map(item => ({
      id: item.id,
      agentName: item.agent.name,
      taskName: item.task.name,
      createdAt: item.createdAt,
      summary: item.outputContent.substring(0, 200),
      status: item.status
    }));

    res.json({
      history: historyWithSummary,
      total,
      hasMore: offset + limit < total
    });
  } catch (error) {
    next(error);
  }
});

// Get history item details
router.get('/:historyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { historyId } = req.params;

    const generation = await prisma.generation.findUnique({
      where: { id: historyId },
      include: {
        agent: {
          select: {
            name: true
          }
        },
        task: {
          select: {
            name: true
          }
        }
      }
    });

    if (!generation) {
      throw new AppError('History item not found', 404);
    }

    res.json({
      id: generation.id,
      agentName: generation.agent.name,
      taskName: generation.task.name,
      createdAt: generation.createdAt,
      summary: generation.outputContent.substring(0, 200),
      fullContent: generation.outputContent,
      input: {
        text: generation.inputText,
        fileName: generation.fileName
      },
      duration: generation.duration,
      status: generation.status
    });
  } catch (error) {
    next(error);
  }
});

// Export history item as markdown
router.get('/:historyId/export', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { historyId } = req.params;

    const generation = await prisma.generation.findUnique({
      where: { id: historyId },
      include: {
        agent: true,
        task: true
      }
    });

    if (!generation) {
      throw new AppError('History item not found', 404);
    }

    const markdown = `# Generated Content History

## Task: ${generation.task.name}
## Agent: ${generation.agent.name}
## Generated at: ${generation.createdAt.toISOString()}
## Status: ${generation.status}
## Duration: ${generation.duration}s

---

## Output

${generation.outputContent}

---

## Input

### Text Input
${generation.inputText || 'No text input provided'}

${generation.fileName ? `### File: ${generation.fileName}` : ''}
${generation.fileContent ? `\n${generation.fileContent}` : ''}

---

*Exported at: ${new Date().toISOString()}*
`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="history-${historyId}.md"`);
    res.send(markdown);
  } catch (error) {
    next(error);
  }
});

// Delete specific history item
router.delete('/:historyId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { historyId } = req.params;

    const generation = await prisma.generation.findUnique({
      where: { id: historyId }
    });

    if (!generation) {
      throw new AppError('History item not found', 404);
    }

    await prisma.generation.delete({
      where: { id: historyId }
    });

    res.json({
      message: 'History item deleted successfully',
      id: historyId
    });
  } catch (error) {
    next(error);
  }
});

// Delete old history (cleanup)
router.delete('/cleanup', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Delete history older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await prisma.generation.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    res.json({
      message: `Deleted ${deleted.count} old history items`
    });
  } catch (error) {
    next(error);
  }
});

export default router;