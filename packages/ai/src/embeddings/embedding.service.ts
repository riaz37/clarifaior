import { Configuration, OpenAIApi } from 'openai';

export interface EmbeddingServiceConfig {
  openAIApiKey: string;
}

export class EmbeddingService {
  private openai: OpenAIApi;

  constructor(config: EmbeddingServiceConfig) {
    const configuration = new Configuration({
      apiKey: config.openAIApiKey,
    });
    this.openai = new OpenAIApi(configuration);
  }

  /**
   * Generate embeddings for the given text using OpenAI's API
   * @param text The text to generate embeddings for
   * @returns A promise that resolves to the embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate embeddings for multiple texts in a single batch
   * @param texts Array of texts to generate embeddings for
   * @returns A promise that resolves to an array of embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: texts,
      });

      return response.data.data.map(item => item.embedding);
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error('Failed to generate embeddings');
    }
  }
}