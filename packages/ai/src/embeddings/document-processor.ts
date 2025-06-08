export interface DocumentChunk {
  content: string;
  metadata: {
    source: string;
    pageNumber?: number;
    chunkIndex: number;
    startIndex?: number;
    endIndex?: number;
  };
}

export class DocumentProcessor {
  private readonly DEFAULT_CHUNK_SIZE = 1000;
  private readonly DEFAULT_CHUNK_OVERLAP = 200;

  /**
   * Split text into chunks of specified size with overlap
   * @param text The text to split into chunks
   * @param chunkSize Maximum size of each chunk
   * @param chunkOverlap Number of characters to overlap between chunks
   * @returns Array of text chunks
   */
  splitText(
    text: string,
    chunkSize: number = this.DEFAULT_CHUNK_SIZE,
    chunkOverlap: number = this.DEFAULT_CHUNK_OVERLAP
  ): string[] {
    if (chunkSize <= 0) {
      throw new Error('chunkSize must be greater than 0');
    }

    if (chunkOverlap >= chunkSize) {
      throw new Error('chunkOverlap must be less than chunkSize');
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;
      
      // Try to find a good breaking point (space or newline)
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        const lastNewline = text.lastIndexOf('\n', end);
        
        // Prefer breaking at newline if it's close
        if (lastNewline > start && (end - lastNewline) < 100) {
          end = lastNewline + 1;
        } else if (lastSpace > start && (end - lastSpace) < 50) {
          end = lastSpace + 1;
        }
      }

      chunks.push(text.substring(start, end).trim());
      
      // Move start to the end of previous chunk minus overlap
      start = end - Math.min(chunkOverlap, end - start);
      
      // If we didn't make progress, force progress to avoid infinite loop
      if (start >= end) {
        start = end;
      }
    }

    return chunks;
  }

  /**
   * Process a document into chunks with metadata
   * @param content The document content
   * @param source Source identifier for the document
   * @param chunkSize Maximum size of each chunk
   * @param chunkOverlap Number of characters to overlap between chunks
   * @returns Array of document chunks with metadata
   */
  processDocument(
    content: string,
    source: string,
    chunkSize: number = this.DEFAULT_CHUNK_SIZE,
    chunkOverlap: number = this.DEFAULT_CHUNK_OVERLAP
  ): DocumentChunk[] {
    const chunks = this.splitText(content, chunkSize, chunkOverlap);
    
    return chunks.map((chunk, index) => ({
      content: chunk,
      metadata: {
        source,
        chunkIndex: index,
      },
    }));
  }

  /**
   * Process multiple documents into chunks with metadata
   * @param documents Array of { content: string, source: string } objects
   * @param chunkSize Maximum size of each chunk
   * @param chunkOverlap Number of characters to overlap between chunks
   * @returns Flattened array of document chunks with metadata
   */
  processDocuments(
    documents: Array<{ content: string; source: string }>,
    chunkSize: number = this.DEFAULT_CHUNK_SIZE,
    chunkOverlap: number = this.DEFAULT_CHUNK_OVERLAP
  ): DocumentChunk[] {
    return documents.flatMap(doc => 
      this.processDocument(doc.content, doc.source, chunkSize, chunkOverlap)
    );
  }
}