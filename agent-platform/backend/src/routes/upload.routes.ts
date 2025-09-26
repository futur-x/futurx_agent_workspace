import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Accept only text and markdown files
    const allowedMimes = ['text/plain', 'text/markdown', 'text/x-markdown'];
    const allowedExts = ['.txt', '.md', '.markdown'];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError('Only .txt and .md files are allowed', 400) as any);
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// Upload file
router.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const content = buffer.toString('utf-8');
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User ID not found in session', 401);
    }

    // Save upload record to database with userId
    const uploadRecord = await prisma.upload.create({
      data: {
        userId,
        fileName: originalname,
        mimeType: mimetype,
        size,
        content
      }
    });

    res.json({
      fileId: uploadRecord.id,
      filename: originalname,
      content,
      size
    });
  } catch (error) {
    next(error);
  }
});

// Get uploaded file by ID
router.get('/:fileId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User ID not found in session', 401);
    }

    const upload = await prisma.upload.findUnique({
      where: { id: fileId }
    });

    if (!upload) {
      throw new AppError('File not found', 404);
    }

    // Check if user has access to this upload
    if (req.user?.role !== 'admin' && upload.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      fileId: upload.id,
      filename: upload.fileName,
      content: upload.content,
      size: upload.size,
      uploadedAt: upload.createdAt
    });
  } catch (error) {
    next(error);
  }
});

export default router;