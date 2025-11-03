export interface ChunkConfig {
  chunkSize: number; // Number of characters per chunk
  overlap: number; // Number of overlapping characters between chunks
}

export interface TextChunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
}

// Split text into chunks with overlap
export function chunkText(text: string, config: ChunkConfig): TextChunk[] {
  const { chunkSize, overlap } = config;
  const chunks: TextChunk[] = [];

  if (!text || text.trim().length === 0) {
    return chunks;
  }

  // Ensure overlap is not larger than chunk size
  const validOverlap = Math.min(overlap, Math.floor(chunkSize / 2));

  let startChar = 0;
  let index = 0;

  while (startChar < text.length) {
    const endChar = Math.min(startChar + chunkSize, text.length);
    let chunkText = text.substring(startChar, endChar);

    // Try to break at sentence boundaries for better chunks
    if (endChar < text.length) {
      // Look for sentence endings near the chunk boundary
      const sentenceEndings = ['. ', '。', '! ', '！', '? ', '？', '\n\n'];
      let bestBreak = -1;
      let bestBreakPos = -1;

      // Search in the last 20% of the chunk for sentence endings
      const searchStart = Math.floor(chunkText.length * 0.8);

      for (const ending of sentenceEndings) {
        const pos = chunkText.lastIndexOf(ending, chunkText.length);
        if (pos > searchStart && pos > bestBreakPos) {
          bestBreakPos = pos;
          bestBreak = pos + ending.length;
        }
      }

      // If we found a good break point, use it
      if (bestBreak > 0) {
        chunkText = chunkText.substring(0, bestBreak);
      }
    }

    // Only add non-empty chunks
    if (chunkText.trim().length > 0) {
      chunks.push({
        text: chunkText.trim(),
        index,
        startChar,
        endChar: startChar + chunkText.length
      });
      index++;
    }

    // Move to next chunk position with overlap
    // Use the actual chunk length, ensuring at least 1 char progress
    const actualEndChar = startChar + chunkText.length;
    const nextStart = actualEndChar - validOverlap;

    // Ensure we always make progress (minimum 1 character forward)
    if (nextStart <= startChar) {
      startChar = startChar + Math.max(1, chunkText.length);
    } else {
      startChar = nextStart;
    }
  }

  return chunks;
}

// Split text by paragraphs first, then chunk large paragraphs
export function chunkTextByParagraphs(text: string, config: ChunkConfig): TextChunk[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: TextChunk[] = [];
  let currentChar = 0;
  let index = 0;

  for (const paragraph of paragraphs) {
    if (paragraph.trim().length === 0) {
      currentChar += paragraph.length + 2; // Account for newlines
      continue;
    }

    // If paragraph is smaller than chunk size, keep it as one chunk
    if (paragraph.length <= config.chunkSize) {
      chunks.push({
        text: paragraph.trim(),
        index,
        startChar: currentChar,
        endChar: currentChar + paragraph.length
      });
      index++;
    } else {
      // Chunk large paragraphs
      const paragraphChunks = chunkText(paragraph, config);
      paragraphChunks.forEach((chunk) => {
        chunks.push({
          ...chunk,
          index,
          startChar: currentChar + chunk.startChar,
          endChar: currentChar + chunk.endChar
        });
        index++;
      });
    }

    currentChar += paragraph.length + 2; // Account for paragraph separator
  }

  return chunks;
}

// Extract keywords from text for metadata
export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  // Simple keyword extraction: get most common meaningful words
  const words = text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ') // Keep alphanumeric and Chinese characters
    .split(/\s+/)
    .filter((word) => word.length > 2); // Filter short words

  // Count word frequency
  const wordFreq: { [key: string]: number } = {};
  words.forEach((word) => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  // Sort by frequency and take top N
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map((entry) => entry[0]);

  return sortedWords;
}

// Calculate optimal chunk size based on document length
export function calculateOptimalChunkSize(textLength: number): ChunkConfig {
  // Default configuration
  let chunkSize = 1000;
  let overlap = 200;

  if (textLength < 2000) {
    // Small documents: use smaller chunks
    chunkSize = 500;
    overlap = 100;
  } else if (textLength > 50000) {
    // Large documents: use larger chunks
    chunkSize = 2000;
    overlap = 400;
  }

  return { chunkSize, overlap };
}
