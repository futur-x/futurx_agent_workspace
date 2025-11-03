import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { parseDocument, isSupportedFileType } from '../services/fileParser.service';
import { chunkTextByParagraphs, extractKeywords } from '../services/textChunker.service';
import { getOrCreateCollection, addDocuments } from '../services/vectorStore.service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (isSupportedFileType(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only .doc, .docx, .md, .markdown, .txt are allowed.'));
    }
  }
});

// Upload document to local knowledge base
router.post(
  '/knowledge-bases/:id/documents',
  authenticateToken,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const isAdmin = req.user?.role === 'admin';
      const file = req.file;

      if (!file) {
        throw new AppError('No file uploaded', 400);
      }

      // Check knowledge base exists and is local type
      const knowledgeBase = await prisma.knowledgeBase.findUnique({
        where: { id },
        include: {
          userKnowledgeBases: true
        }
      });

      if (!knowledgeBase) {
        throw new AppError('知识库未找到', 404);
      }

      if (knowledgeBase.type !== 'local') {
        throw new AppError('只有本地知识库支持文件上传', 400);
      }

      // Check permission
      const hasPermission =
        isAdmin ||
        knowledgeBase.createdBy === userId ||
        knowledgeBase.userKnowledgeBases.some((ukb) => ukb.userId === userId);

      if (!hasPermission) {
        throw new AppError('无权访问此知识库', 403);
      }

      // Get embedding config
      const embeddingConfigData = await prisma.systemConfig.findUnique({
        where: { key: 'embedding_model' }
      });

      if (!embeddingConfigData) {
        throw new AppError('请先配置 Embedding 模型', 400);
      }

      const embeddingConfig = JSON.parse(embeddingConfigData.value);

      // Parse document - use original filename for type detection
      const parsedDoc = await parseDocument(file.path, file.originalname);

      // Get knowledge base config for chunking settings
      const kbConfig = JSON.parse(knowledgeBase.config);
      const chunkConfig = {
        chunkSize: kbConfig.chunkSize || 1000,
        overlap: kbConfig.overlap || 200
      };

      // Chunk text
      console.log('[UPLOAD] Starting text chunking...');
      const chunks = chunkTextByParagraphs(parsedDoc.text, chunkConfig);
      console.log(`[UPLOAD] Created ${chunks.length} chunks`);

      if (chunks.length === 0) {
        throw new AppError('文档内容为空', 400);
      }

      // Get or create ChromaDB collection
      console.log('[UPLOAD] Getting/creating ChromaDB collection...');
      const collectionName = await getOrCreateCollection(id);
      console.log(`[UPLOAD] Collection name: ${collectionName}`);

      // Prepare chunk data
      const chunkTexts = chunks.map((chunk) => chunk.text);
      const chunkIds = chunks.map(() => `${id}_${uuidv4()}`);
      console.log(`[UPLOAD] Prepared ${chunkTexts.length} chunks for embedding`);

      // Generate embeddings for all chunks using external API
      console.log('[UPLOAD] Generating embeddings...');
      const { generateEmbeddings } = await import('../services/vectorStore.service');
      const chunkEmbeddings = await generateEmbeddings(chunkTexts, embeddingConfig);
      console.log(`[UPLOAD] Generated ${chunkEmbeddings.length} embeddings`);
      const chunkMetadata = chunks.map((chunk) => ({
        documentId: '', // Will be filled after document creation
        fileName: file.originalname,
        chunkIndex: chunk.index,
        startChar: chunk.startChar,
        endChar: chunk.endChar,
        keywords: extractKeywords(chunk.text, 5).join(',')
      }));

      // Add to vector store with pre-generated embeddings
      await addDocuments(collectionName, chunkTexts, chunkEmbeddings, chunkMetadata, chunkIds);

      // Create document record
      const document = await prisma.document.create({
        data: {
          knowledgeBaseId: id,
          fileName: file.originalname,
          fileType: parsedDoc.metadata.fileType,
          fileSize: parsedDoc.metadata.fileSize,
          chunkCount: chunks.length,
          vectorIds: JSON.stringify(chunkIds),
          metadata: JSON.stringify({
            ...parsedDoc.metadata,
            chunkConfig
          })
        }
      });

      // Clean up temp file
      await fs.unlink(file.path);

      res.status(201).json({
        document,
        message: '文档上传并向量化成功'
      });
    } catch (error) {
      // Clean up temp file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (e) {
          console.error('Failed to clean up temp file:', e);
        }
      }
      next(error);
    }
  }
);

// Get documents in knowledge base
router.get(
  '/knowledge-bases/:id/documents',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const isAdmin = req.user?.role === 'admin';

      // Check permission
      const knowledgeBase = await prisma.knowledgeBase.findUnique({
        where: { id },
        include: {
          userKnowledgeBases: true
        }
      });

      if (!knowledgeBase) {
        throw new AppError('知识库未找到', 404);
      }

      const hasPermission =
        isAdmin ||
        knowledgeBase.createdBy === userId ||
        knowledgeBase.userKnowledgeBases.some((ukb) => ukb.userId === userId);

      if (!hasPermission) {
        throw new AppError('无权访问此知识库', 403);
      }

      const documents = await prisma.document.findMany({
        where: { knowledgeBaseId: id },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ documents });
    } catch (error) {
      next(error);
    }
  }
);

// Delete document from knowledge base
router.delete(
  '/documents/:id',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const isAdmin = req.user?.role === 'admin';

      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          knowledgeBase: {
            include: {
              userKnowledgeBases: true
            }
          }
        }
      });

      if (!document) {
        throw new AppError('文档未找到', 404);
      }

      // Check permission
      const hasPermission =
        isAdmin ||
        document.knowledgeBase.createdBy === userId ||
        document.knowledgeBase.userKnowledgeBases.some((ukb) => ukb.userId === userId);

      if (!hasPermission) {
        throw new AppError('无权删除此文档', 403);
      }

      // Get embedding config
      const embeddingConfigData = await prisma.systemConfig.findUnique({
        where: { key: 'embedding_model' }
      });

      if (embeddingConfigData) {
        try {
          const collectionName = await getOrCreateCollection(document.knowledgeBaseId);

          // Delete vectors from ChromaDB
          const vectorIds = JSON.parse(document.vectorIds);
          const { deleteDocuments } = await import('../services/vectorStore.service');
          await deleteDocuments(collectionName, vectorIds);
        } catch (error) {
          console.error('Failed to delete vectors from ChromaDB:', error);
          // Continue with database deletion even if vector deletion fails
        }
      }

      // Delete document record
      await prisma.document.delete({
        where: { id }
      });

      res.json({ message: '文档已删除' });
    } catch (error) {
      next(error);
    }
  }
);

// Get document chunks
router.get(
  '/documents/:id/chunks',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const isAdmin = req.user?.role === 'admin';

      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          knowledgeBase: {
            include: {
              userKnowledgeBases: true
            }
          }
        }
      });

      if (!document) {
        throw new AppError('文档未找到', 404);
      }

      // Check permission
      const hasPermission =
        isAdmin ||
        document.knowledgeBase.createdBy === userId ||
        document.knowledgeBase.userKnowledgeBases.some((ukb) => ukb.userId === userId);

      if (!hasPermission) {
        throw new AppError('无权访问此文档', 403);
      }

      // Get chunks from ChromaDB
      const vectorIds = JSON.parse(document.vectorIds);
      const collectionName = await getOrCreateCollection(document.knowledgeBaseId);
      const { getDocumentsByIds } = await import('../services/vectorStore.service');
      const chunks = await getDocumentsByIds(collectionName, vectorIds);

      res.json({ chunks });
    } catch (error) {
      next(error);
    }
  }
);

// Update document chunk
router.put(
  '/documents/:id/chunks/:chunkId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, chunkId } = req.params;
      const { text } = req.body;
      const userId = req.user?.userId;
      const isAdmin = req.user?.role === 'admin';

      if (!text || typeof text !== 'string') {
        throw new AppError('文本内容不能为空', 400);
      }

      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          knowledgeBase: {
            include: {
              userKnowledgeBases: true
            }
          }
        }
      });

      if (!document) {
        throw new AppError('文档未找到', 404);
      }

      // Check permission
      const hasPermission =
        isAdmin ||
        document.knowledgeBase.createdBy === userId ||
        document.knowledgeBase.userKnowledgeBases.some((ukb) => ukb.userId === userId);

      if (!hasPermission) {
        throw new AppError('无权修改此文档', 403);
      }

      // Get embedding config
      const embeddingConfigData = await prisma.systemConfig.findUnique({
        where: { key: 'embedding_model' }
      });

      if (!embeddingConfigData) {
        throw new AppError('请先配置 Embedding 模型', 400);
      }

      const embeddingConfig = JSON.parse(embeddingConfigData.value);

      // Generate new embedding for updated text
      const { generateEmbeddings, updateDocument } = await import('../services/vectorStore.service');
      const newEmbeddings = await generateEmbeddings([text], embeddingConfig);
      const newEmbedding = newEmbeddings[0];

      // Get collection and update
      const collectionName = await getOrCreateCollection(document.knowledgeBaseId);

      // Get existing metadata and update
      const { getDocumentsByIds } = await import('../services/vectorStore.service');
      const existingChunks = await getDocumentsByIds(collectionName, [chunkId]);
      const existingMetadata = existingChunks[0]?.metadata || {};

      await updateDocument(
        collectionName,
        chunkId,
        text,
        newEmbedding,
        existingMetadata
      );

      res.json({
        message: 'Chunk更新成功',
        chunk: {
          id: chunkId,
          text,
          metadata: existingMetadata
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Test search in knowledge base
router.post(
  '/knowledge-bases/:id/search',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { query, mode = 'hybrid', similarity = 0.4, limit = 10, vectorWeight = 0.7 } = req.body;
      const userId = req.user?.userId;
      const isAdmin = req.user?.role === 'admin';

      if (!query || typeof query !== 'string') {
        throw new AppError('查询内容不能为空', 400);
      }

      // Check knowledge base exists and permission
      const knowledgeBase = await prisma.knowledgeBase.findUnique({
        where: { id },
        include: {
          userKnowledgeBases: true
        }
      });

      if (!knowledgeBase) {
        throw new AppError('知识库未找到', 404);
      }

      const hasPermission =
        isAdmin ||
        knowledgeBase.createdBy === userId ||
        knowledgeBase.userKnowledgeBases.some((ukb) => ukb.userId === userId);

      if (!hasPermission) {
        throw new AppError('无权访问此知识库', 403);
      }

      // Only support local knowledge base search
      if (knowledgeBase.type !== 'local') {
        throw new AppError('只支持本地知识库的测试搜索', 400);
      }

      // Get embedding config
      const embeddingConfigData = await prisma.systemConfig.findUnique({
        where: { key: 'embedding_model' }
      });

      if (!embeddingConfigData) {
        throw new AppError('请先配置 Embedding 模型', 400);
      }

      const embeddingConfig = JSON.parse(embeddingConfigData.value);

      // Get collection
      const collectionName = await getOrCreateCollection(id);

      // Generate query embedding
      const { generateEmbeddings } = await import('../services/vectorStore.service');
      const queryEmbeddings = await generateEmbeddings([query], embeddingConfig);
      const queryEmbedding = queryEmbeddings[0];

      let results;

      if (mode === 'semantic') {
        // Pure vector search
        const { searchDocuments } = await import('../services/vectorStore.service');
        const vectorResults = await searchDocuments(collectionName, queryEmbedding, limit);

        results = vectorResults.ids[0].map((id: string, index: number) => ({
          id,
          text: vectorResults.documents[0][index],
          metadata: vectorResults.metadatas[0][index],
          score: 1 - (vectorResults.distances ? vectorResults.distances[0][index] : 0),
          distance: vectorResults.distances ? vectorResults.distances[0][index] : 0
        }));

        // Filter by similarity
        results = results.filter((r: any) => r.score >= similarity);
      } else {
        // Hybrid search
        const keywords = query.split(/\s+/).filter((word) => word.length > 2);
        const { hybridSearch } = await import('../services/vectorStore.service');
        results = await hybridSearch(
          collectionName,
          queryEmbedding,
          keywords,
          limit,
          vectorWeight
        );

        // Filter by similarity
        results = results.filter((r: any) => r.hybridScore >= similarity);
      }

      res.json({
        query,
        mode,
        similarity,
        limit,
        vectorWeight: mode === 'hybrid' ? vectorWeight : undefined,
        results
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
