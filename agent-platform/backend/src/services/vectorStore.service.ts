import axios from 'axios';
import { ChromaClient } from 'chromadb';

const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = process.env.CHROMA_PORT || '8000';

// Initialize ChromaDB client with full URL path
const chromaClient = new ChromaClient({
  path: `http://${CHROMA_HOST}:${CHROMA_PORT}`
});

// Generate embeddings using external API (OpenAI-compatible)
export async function generateEmbeddings(
  texts: string[],
  embeddingConfig: { apiKey: string; baseUrl: string; model: string }
): Promise<number[][]> {
  try {
    const response = await axios.post(
      embeddingConfig.baseUrl,
      {
        model: embeddingConfig.model,
        input: texts
      },
      {
        headers: {
          Authorization: `Bearer ${embeddingConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.data) {
      return response.data.data.map((item: any) => item.embedding);
    }

    throw new Error('Invalid embedding response format');
  } catch (error: any) {
    console.error('Embedding generation error:', error.message);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
}

// Create or get collection using ChromaDB client
export async function getOrCreateCollection(knowledgeBaseId: string): Promise<string> {
  const collectionName = `kb_${knowledgeBaseId}`;

  try {
    // Use getOrCreateCollection method from ChromaDB client
    // Set embeddingFunction to null since we generate embeddings externally
    await chromaClient.getOrCreateCollection({
      name: collectionName,
      metadata: { knowledgeBaseId },
      embeddingFunction: null as any
    });
    console.log(`Collection ${collectionName} ready`);
    return collectionName;
  } catch (error: any) {
    console.error('Get/Create collection error:', error.message);
    throw new Error(`Failed to get/create collection: ${error.message}`);
  }
}

// Add documents to collection with pre-generated embeddings
export async function addDocuments(
  collectionName: string,
  documents: string[],
  embeddings: number[][],
  metadatas: any[],
  ids: string[]
): Promise<void> {
  try {
    const collection = await chromaClient.getCollection({
      name: collectionName,
      embeddingFunction: null as any
    });

    await collection.add({
      ids,
      embeddings,
      documents,
      metadatas
    });

    console.log(`Added ${documents.length} documents to ${collectionName}`);
  } catch (error: any) {
    console.error('Add documents error:', error.message);
    throw new Error(`Failed to add documents: ${error.message}`);
  }
}

// Search documents using vector similarity with pre-generated query embedding
export async function searchDocuments(
  collectionName: string,
  queryEmbedding: number[],
  nResults: number = 10,
  whereFilter?: any
): Promise<any> {
  try {
    const collection = await chromaClient.getCollection({
      name: collectionName,
      embeddingFunction: null as any
    });

    const queryParams: any = {
      queryEmbeddings: [queryEmbedding],
      nResults
    };

    if (whereFilter) {
      queryParams.where = whereFilter;
    }

    const results = await collection.query(queryParams);

    return results;
  } catch (error: any) {
    console.error('Search documents error:', error.message);
    throw new Error(`Failed to search documents: ${error.message}`);
  }
}

// Delete collection
export async function deleteCollection(knowledgeBaseId: string): Promise<void> {
  try {
    const collectionName = `kb_${knowledgeBaseId}`;
    await chromaClient.deleteCollection({ name: collectionName });
    console.log(`Deleted collection ${collectionName}`);
  } catch (error: any) {
    console.error('Delete collection error:', error.message);
    throw new Error(`Failed to delete collection: ${error.message}`);
  }
}

// Delete specific documents from collection
export async function deleteDocuments(
  collectionName: string,
  ids: string[]
): Promise<void> {
  try {
    const collection = await chromaClient.getCollection({
      name: collectionName,
      embeddingFunction: null as any
    });
    await collection.delete({ ids });
    console.log(`Deleted ${ids.length} documents from ${collectionName}`);
  } catch (error: any) {
    console.error('Delete documents error:', error.message);
    throw new Error(`Failed to delete documents: ${error.message}`);
  }
}

// Get collection stats
export async function getCollectionStats(
  knowledgeBaseId: string
): Promise<{ count: number; metadata: any }> {
  try {
    const collectionName = `kb_${knowledgeBaseId}`;
    const collection = await chromaClient.getCollection({
      name: collectionName,
      embeddingFunction: null as any
    });
    const count = await collection.count();

    return {
      count,
      metadata: {}
    };
  } catch (error: any) {
    console.error('Get collection stats error:', error.message);
    return { count: 0, metadata: {} };
  }
}

// Get specific documents by IDs from collection
export async function getDocumentsByIds(
  collectionName: string,
  ids: string[]
): Promise<any[]> {
  try {
    const collection = await chromaClient.getCollection({
      name: collectionName,
      embeddingFunction: null as any
    });

    const results = await collection.get({
      ids
    });

    // Format results to include id, document text, metadata
    const documents = results.ids.map((id: string, index: number) => ({
      id,
      text: results.documents[index],
      metadata: results.metadatas ? results.metadatas[index] : {},
      embedding: results.embeddings ? results.embeddings[index] : null
    }));

    return documents;
  } catch (error: any) {
    console.error('Get documents by IDs error:', error.message);
    throw new Error(`Failed to get documents by IDs: ${error.message}`);
  }
}

// Update a specific document's embedding
export async function updateDocument(
  collectionName: string,
  id: string,
  text: string,
  embedding: number[],
  metadata: any
): Promise<void> {
  try {
    const collection = await chromaClient.getCollection({
      name: collectionName,
      embeddingFunction: null as any
    });

    // ChromaDB doesn't have direct update, so delete and re-add
    await collection.delete({ ids: [id] });
    await collection.add({
      ids: [id],
      embeddings: [embedding],
      documents: [text],
      metadatas: [metadata]
    });

    console.log(`Updated document ${id} in ${collectionName}`);
  } catch (error: any) {
    console.error('Update document error:', error.message);
    throw new Error(`Failed to update document: ${error.message}`);
  }
}

// Hybrid search: combine vector search with keyword matching
export async function hybridSearch(
  collectionName: string,
  queryEmbedding: number[],
  keywords: string[],
  nResults: number = 10,
  vectorWeight: number = 0.7
): Promise<any[]> {
  try {
    // Vector search with pre-generated embedding
    const vectorResults = await searchDocuments(collectionName, queryEmbedding, nResults * 2);

    // Extract results
    const results = vectorResults.ids[0].map((id: string, index: number) => ({
      id,
      text: vectorResults.documents[0][index],
      document: vectorResults.documents[0][index], // Keep for backward compatibility
      metadata: vectorResults.metadatas[0][index],
      distance: vectorResults.distances ? vectorResults.distances[0][index] : 0,
      vectorScore: 1 - (vectorResults.distances ? vectorResults.distances[0][index] : 0)
    }));

    // Keyword matching score
    const scoredResults = results.map((result) => {
      let keywordScore = 0;
      const docLower = result.text.toLowerCase();

      keywords.forEach((keyword) => {
        const keywordLower = keyword.toLowerCase();
        const count = (docLower.match(new RegExp(keywordLower, 'g')) || []).length;
        keywordScore += count > 0 ? 1 : 0;
      });

      // Normalize keyword score
      keywordScore = keywords.length > 0 ? keywordScore / keywords.length : 0;

      // Hybrid score
      const hybridScore = vectorWeight * result.vectorScore + (1 - vectorWeight) * keywordScore;

      return {
        ...result,
        keywordScore,
        hybridScore
      };
    });

    // Sort by hybrid score
    scoredResults.sort((a, b) => b.hybridScore - a.hybridScore);

    return scoredResults.slice(0, nResults);
  } catch (error: any) {
    console.error('Hybrid search error:', error.message);
    throw new Error(`Failed to perform hybrid search: ${error.message}`);
  }
}
