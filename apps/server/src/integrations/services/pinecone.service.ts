import { Injectable, BadRequestException } from '@nestjs/common';
import { Pinecone } from '@pinecone-database/pinecone';
import { LoggerService } from '@common/services/logger.service';
import { MemorySearchRequest, MemoryDocument } from '@repo/types';

@Injectable()
export class PineconeService {
  private pinecone: Pinecone;
  private indexName: string;

  constructor(private logger: LoggerService) {
    this.logger.setContext('PineconeService');
    this.indexName = process.env.PINECONE_INDEX_NAME || 'clarifaior-memory';

    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      this.logger.warn('Pinecone API key not configured');
      return;
    }

    try {
      this.pinecone = new Pinecone({
        apiKey: apiKey,
      });
      this.logger.log('Pinecone client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Pinecone client', error.stack);
    }
  }

  async searchMemory(request: MemorySearchRequest): Promise<any[]> {
    if (!this.pinecone) {
      throw new BadRequestException('Pinecone not configured');
    }

    const { query, topK, threshold } = request;

    this.logger.log(`Searching Pinecone memory`, {
      query: query.substring(0, 100),
      topK,
      threshold,
      indexName: this.indexName,
    });

    try {
      // Get the index
      const index = this.pinecone.index(this.indexName);

      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search for similar vectors
      const searchResponse = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        includeValues: false,
      });

      // Filter by threshold and format results
      const results =
        searchResponse.matches
          ?.filter((match) => match.score >= threshold)
          .map((match) => ({
            id: match.id,
            score: match.score,
            content: match.metadata?.content || '',
            metadata: match.metadata || {},
          })) || [];

      this.logger.log(`Pinecone search completed`, {
        query: query.substring(0, 50),
        resultsCount: results.length,
        topScore: results[0]?.score,
      });

      return results;
    } catch (error) {
      this.logger.error(`Pinecone search failed`, error.stack, {
        query: query.substring(0, 50),
        indexName: this.indexName,
        error: error.message,
      });

      throw new BadRequestException(`Memory search failed: ${error.message}`);
    }
  }

  async storeMemory(document: MemoryDocument): Promise<void> {
    if (!this.pinecone) {
      throw new BadRequestException('Pinecone not configured');
    }

    this.logger.log(`Storing document in Pinecone`, {
      id: document.id,
      contentLength: document.content.length,
      indexName: this.indexName,
    });

    try {
      const index = this.pinecone.index(this.indexName);

      // Generate embedding if not provided
      const embedding =
        document.embedding || (await this.generateEmbedding(document.content));

      // Upsert the vector
      await index.upsert([
        {
          id: document.id,
          values: embedding,
          metadata: {
            content: document.content,
            ...document.metadata,
            createdAt: new Date().toISOString(),
          },
        },
      ]);

      this.logger.log(`Document stored successfully`, {
        id: document.id,
        indexName: this.indexName,
      });
    } catch (error) {
      this.logger.error(`Failed to store document`, error.stack, {
        id: document.id,
        error: error.message,
      });

      throw new BadRequestException(`Failed to store memory: ${error.message}`);
    }
  }

  async deleteMemory(id: string): Promise<void> {
    if (!this.pinecone) {
      throw new BadRequestException('Pinecone not configured');
    }

    try {
      const index = this.pinecone.index(this.indexName);
      await index.deleteOne(id);

      this.logger.log(`Document deleted`, { id, indexName: this.indexName });
    } catch (error) {
      this.logger.error(`Failed to delete document`, error.stack, {
        id,
        error: error.message,
      });

      throw new BadRequestException(
        `Failed to delete memory: ${error.message}`,
      );
    }
  }

  async getIndexStats(): Promise<any> {
    if (!this.pinecone) {
      throw new BadRequestException('Pinecone not configured');
    }

    try {
      const index = this.pinecone.index(this.indexName);
      const stats = await index.describeIndexStats();
      return {
        indexName: this.indexName,
        dimension: stats.dimension,
        fullDimension: stats.dimension, // Using the same value as fullDimension is not available
        totalVectorCount: stats.totalRecordCount || 0, // Using totalRecordCount instead of totalVectorCount
        namespaces: stats.namespaces,
        totalRecordCount: stats.totalRecordCount || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get index stats`, error.stack);
      throw new BadRequestException(
        `Failed to get index stats: ${error.message}`,
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.pinecone) {
      return false;
    }

    try {
      // Try to list indexes to test connection
      const indexes = await this.pinecone.listIndexes();

      // Check if our index exists
      const indexExists = indexes.indexes?.some(
        (index) => index.name === this.indexName,
      );

      if (!indexExists) {
        this.logger.warn(`Index '${this.indexName}' not found`, {
          availableIndexes: indexes.indexes?.map((i) => i.name),
        });
        return false;
      }

      this.logger.log('Pinecone connection test successful', {
        indexName: this.indexName,
        indexCount: indexes.indexes?.length,
      });

      return true;
    } catch (error) {
      this.logger.error('Pinecone connection test failed', error.stack);
      return false;
    }
  }

  async createIndex(dimension: number = 1536): Promise<void> {
    if (!this.pinecone) {
      throw new BadRequestException('Pinecone not configured');
    }

    try {
      this.logger.log(`Creating Pinecone index: ${this.indexName}`);

      await this.pinecone.createIndex({
        name: this.indexName,
        dimension: dimension,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });

      this.logger.log(`Index created successfully: ${this.indexName}`);
    } catch (error) {
      this.logger.error(`Failed to create index`, error.stack);
      throw new BadRequestException(`Failed to create index: ${error.message}`);
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // For now, use OpenAI embeddings (most common)
    // In production, you might want to use different embedding models

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new BadRequestException('OpenAI API key required for embeddings');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding', error.stack);
      throw new BadRequestException(
        `Failed to generate embedding: ${error.message}`,
      );
    }
  }
}
