// Vector Database Types
export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface MemoryDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
  score?: number; // For search results
}

export interface VectorSearchRequest {
  vector: number[];
  topK: number;
  includeMetadata?: boolean;
  includeValues?: boolean;
  filter?: Record<string, any>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
  values?: number[];
}

export interface VectorDbConfig {
  apiKey: string;
  environment: string;
  indexName: string;
  dimension: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
}
