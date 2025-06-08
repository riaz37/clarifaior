import { EmbeddingService } from './embedding.service';
import { DocumentChunk } from './document-processor';

export interface VectorDocument extends DocumentChunk {
  embedding: number[];
}

export interface SimilarityResult {
  document: VectorDocument;
  similarity: number;
}

export class VectorStoreService {
  private documents: VectorDocument[] = [];
  private readonly SIMILARITY_THRESHOLD = 0.7; // Adjust based on your needs

  constructor(private readonly embeddingService: EmbeddingService) {}

  /**
   * Add a single document to the vector store
   * @param document Document to add
   * @param generateEmbedding Whether to generate embedding if not provided
   */
  async addDocument(
    document: Omit<VectorDocument, 'embedding'> & { embedding?: number[] }
  ): Promise<void> {
    let embedding = document.embedding;
    
    if (!embedding) {
      embedding = await this.embeddingService.generateEmbedding(document.content);
    }

    this.documents.push({
      ...document,
      embedding,
    });
  }

  /**
   * Add multiple documents to the vector store
   * @param documents Array of documents to add
   * @param generateEmbeddings Whether to generate embeddings if not provided
   */
  async addDocuments(
    documents: Array<Omit<VectorDocument, 'embedding'> & { embedding?: number[] }>
  ): Promise<void> {
    // Separate documents with and without embeddings
    const docsWithEmbeddings = documents.filter(doc => doc.embedding);
    const docsWithoutEmbeddings = documents.filter(doc => !doc.embedding);
    
    // Generate embeddings for documents without them
    if (docsWithoutEmbeddings.length > 0) {
      const embeddings = await this.embeddingService.generateEmbeddings(
        docsWithoutEmbeddings.map(doc => doc.content)
      );

      // Add documents with newly generated embeddings
      docsWithoutEmbeddings.forEach((doc, index) => {
        this.documents.push({
          ...doc,
          embedding: embeddings[index],
        });
      });
    }

    // Add documents that already had embeddings
    this.documents.push(...docsWithEmbeddings as VectorDocument[]);
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity score between -1 and 1
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find similar documents to the query
   * @param query The query string or embedding vector
   * @param k Number of results to return
   * @param threshold Minimum similarity score (0-1)
   * @returns Array of similar documents with similarity scores
   */
  async similaritySearch(
    query: string | number[],
    k: number = 5,
    threshold: number = this.SIMILARITY_THRESHOLD
  ): Promise<SimilarityResult[]> {
    let queryEmbedding: number[];

    if (Array.isArray(query)) {
      queryEmbedding = query;
    } else {
      queryEmbedding = await this.embeddingService.generateEmbedding(query);
    }

    // Calculate similarity scores for all documents
    const results: SimilarityResult[] = this.documents.map(doc => ({
      document: doc,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // Filter by threshold and sort by similarity
    return results
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  /**
   * Find similar documents using a query string and return their content
   * @param query The query string
   * @param k Number of results to return
   * @param threshold Minimum similarity score (0-1)
   * @returns Array of document contents with similarity scores
   */
  async similaritySearchWithScore(
    query: string,
    k: number = 5,
    threshold: number = this.SIMILARITY_THRESHOLD
  ): Promise<Array<{ content: string; score: number }>> {
    const results = await this.similaritySearch(query, k, threshold);
    return results.map(result => ({
      content: result.document.content,
      score: result.similarity,
    }));
  }

  /**
   * Get all documents in the vector store
   * @returns Array of all documents
   */
  getAllDocuments(): VectorDocument[] {
    return [...this.documents];
  }

  /**
   * Clear all documents from the vector store
   */
  clear(): void {
    this.documents = [];
  }

  /**
   * Get the number of documents in the vector store
   */
  get size(): number {
    return this.documents.length;
  }
}