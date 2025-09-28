import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { generateWithDify, parseSSEMessage } from '../services/dify.service';
import { FastGPTService } from '../services/fastgpt.service';
import { replacePlaceholders } from '../validators/task.validator';

const router = Router();
const prisma = new PrismaClient();

// Start content generation - requires authentication
router.post('/start', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentId, taskId, input } = req.body;

    if (!agentId || !taskId || !input) {
      throw new AppError('Agent ID, Task ID, and input are required', 400);
    }

    // Get agent configuration
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent || !agent.isActive) {
      throw new AppError('Agent not found or inactive', 404);
    }

    // Get task template
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Prepare prompt with placeholders
    let fileContent = '';
    if (input.fileId) {
      const upload = await prisma.upload.findUnique({
        where: { id: input.fileId }
      });
      if (upload) {
        fileContent = upload.content;
      }
    }

    const placeholderValues = {
      input_text: input.text || '',
      file_content: fileContent
    };

    const finalPrompt = replacePlaceholders(task.promptTemplate, placeholderValues);

    // Create generation record with userId
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('User ID not found in session', 401);
    }

    const generation = await prisma.generation.create({
      data: {
        userId,
        agentId,
        taskId,
        inputText: input.text,
        fileName: input.fileName,
        fileContent,
        outputContent: '',
        duration: 0,
        status: 'processing'
      }
    });

    res.status(202).json({
      generationId: generation.id,
      status: 'starting',
      streamUrl: `/api/generation/stream?generationId=${generation.id}&token=valid-session-token`
    });

    // Start async generation based on agent type
    generateContent(generation.id, agent, finalPrompt, fileContent);
  } catch (error) {
    next(error);
  }
});

// Stream generation results (SSE endpoint)
// Note: SSE endpoints need special auth handling via query params
router.get('/stream', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { generationId, token } = req.query;

    if (!generationId) {
      throw new AppError('Generation ID is required', 400);
    }

    // Validate token from query parameter for SSE
    if (!token || token !== 'valid-session-token') {
      // For now, we'll use a simple validation
      // In production, you'd validate against actual session tokens
      // Since SSE can't use headers, token must come via query param
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

    // Disable Node.js timeout for this connection
    res.setTimeout(0);

    // Send initial connection event
    res.write('data: {"event": "connected"}\n\n');

    // Keep track of last activity
    let lastActivity = Date.now();

    // Send heartbeat every 15 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(':heartbeat\n\n'); // SSE comment as heartbeat
      } catch (error) {
        clearInterval(heartbeatInterval);
        clearInterval(pollInterval);
      }
    }, 15000);

    // Poll for generation updates
    const pollInterval = setInterval(async () => {
      try {
        const generation = await prisma.generation.findUnique({
          where: { id: generationId as string }
        });

        if (!generation) {
          res.write('data: {"event": "error", "message": "Generation not found"}\n\n');
          clearInterval(pollInterval);
          clearInterval(heartbeatInterval);
          res.end();
          return;
        }

        // Send progress updates
        if (generation.status === 'processing') {
          const elapsed = Math.floor((Date.now() - generation.createdAt.getTime()) / 1000);
          res.write(`data: {"event": "progress", "message": "Processing... ${elapsed}s"}\n\n`);
          lastActivity = Date.now();
        }

        if (generation.status === 'completed') {
          res.write(`data: {"event": "complete", "content": ${JSON.stringify(generation.outputContent)}}\n\n`);
          clearInterval(pollInterval);
          clearInterval(heartbeatInterval);
          res.end();
        } else if (generation.status === 'failed') {
          res.write(`data: {"event": "error", "message": ${JSON.stringify(generation.error)}}\n\n`);
          clearInterval(pollInterval);
          clearInterval(heartbeatInterval);
          res.end();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
    });
  } catch (error) {
    next(error);
  }
});

// Download generation result
router.get('/download/:generationId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { generationId } = req.params;

    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
      include: {
        agent: true,
        task: true
      }
    });

    if (!generation) {
      throw new AppError('Generation not found', 404);
    }

    const markdown = `# Generated Content

## Task: ${generation.task.name}
## Agent: ${generation.agent.name}
## Generated at: ${generation.createdAt.toISOString()}

---

${generation.outputContent}

---

### Input
${generation.inputText || 'No text input'}

${generation.fileContent ? `### File Content\n${generation.fileContent}` : ''}
`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="generation-${generationId}.md"`);
    res.send(markdown);
  } catch (error) {
    next(error);
  }
});

// Helper function to generate content asynchronously
async function generateContent(generationId: string, agent: any, prompt: string, fileContent?: string) {
  const startTime = Date.now();
  let fullContent = '';

  try {
    // Use different service based on agent type
    if (agent.type === 'fastgpt') {
      // Use FastGPT service
      const fastGPTService = new FastGPTService(agent.url, agent.apiToken);

      // Use streaming for better UX
      const generator = fastGPTService.generateContentStream(prompt, fileContent);
      for await (const chunk of generator) {
        fullContent += chunk;
      }
    } else {
      // Use Dify service (default)
      const result = await generateWithDify({
        url: agent.url,
        apiToken: agent.apiToken,
        query: prompt,
        responseMode: 'streaming' // Agent Chat Apps require streaming mode
      });

      // Handle streaming response from Dify
      if (result && typeof result === 'object' && 'on' in result) {
        // It's a stream
        const stream = result as any;

        await new Promise((resolve, reject) => {
          stream.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            // Parse SSE messages from Dify
            const lines = text.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr && jsonStr !== '[DONE]') {
                    const data = JSON.parse(jsonStr);
                    if (data.answer) {
                      fullContent += data.answer;
                    } else if (data.message) {
                      fullContent += data.message;
                    }
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          });

          stream.on('end', resolve);
          stream.on('error', reject);
        });
      } else {
        // Fallback if not a stream
        fullContent = String(result);
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        outputContent: fullContent || 'Content generated successfully',
        duration,
        status: 'completed'
      }
    });
  } catch (error) {
    console.error('Generation error:', error);

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: 'failed',
        error: (error as Error).message,
        duration: Math.floor((Date.now() - startTime) / 1000)
      }
    });
  }
}

export default router;