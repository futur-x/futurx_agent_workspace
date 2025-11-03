import mammoth from 'mammoth';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ParsedDocument {
  text: string;
  metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
    parsedAt: Date;
  };
}

// Parse Word document (.doc, .docx)
export async function parseWordDocument(filePath: string): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const stats = await fs.stat(filePath);

    return {
      text: result.value,
      metadata: {
        fileName: path.basename(filePath),
        fileType: 'word',
        fileSize: stats.size,
        parsedAt: new Date()
      }
    };
  } catch (error: any) {
    console.error('Parse Word document error:', error.message);
    throw new Error(`Failed to parse Word document: ${error.message}`);
  }
}

// Parse Markdown document (.md, .markdown)
export async function parseMarkdownDocument(filePath: string): Promise<ParsedDocument> {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);

    return {
      text,
      metadata: {
        fileName: path.basename(filePath),
        fileType: 'markdown',
        fileSize: stats.size,
        parsedAt: new Date()
      }
    };
  } catch (error: any) {
    console.error('Parse Markdown document error:', error.message);
    throw new Error(`Failed to parse Markdown document: ${error.message}`);
  }
}

// Parse plain text document (.txt)
export async function parsePlainTextDocument(filePath: string): Promise<ParsedDocument> {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);

    return {
      text,
      metadata: {
        fileName: path.basename(filePath),
        fileType: 'text',
        fileSize: stats.size,
        parsedAt: new Date()
      }
    };
  } catch (error: any) {
    console.error('Parse plain text document error:', error.message);
    throw new Error(`Failed to parse plain text document: ${error.message}`);
  }
}

// Parse document based on file extension
// @param filePath Path to the file
// @param originalName Optional original filename (used when temp file has no extension)
export async function parseDocument(filePath: string, originalName?: string): Promise<ParsedDocument> {
  // Use original filename for extension detection if provided, otherwise use filePath
  const nameForExtension = originalName || filePath;
  const ext = path.extname(nameForExtension).toLowerCase();

  switch (ext) {
    case '.doc':
    case '.docx':
      return await parseWordDocument(filePath);

    case '.md':
    case '.markdown':
      return await parseMarkdownDocument(filePath);

    case '.txt':
      return await parsePlainTextDocument(filePath);

    default:
      throw new Error(`Unsupported file type: ${ext}. Supported types: .doc, .docx, .md, .markdown, .txt`);
  }
}

// Validate file type
export function isSupportedFileType(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return ['.doc', '.docx', '.md', '.markdown', '.txt'].includes(ext);
}

// Get file extension
export function getFileType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === '.doc' || ext === '.docx') return 'word';
  if (ext === '.md' || ext === '.markdown') return 'markdown';
  if (ext === '.txt') return 'text';

  return 'unknown';
}
