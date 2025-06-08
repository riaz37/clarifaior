export interface MemoryStoreOptions {
  /** Maximum number of items to store in memory */
  maxItems?: number;
  
  /** Time to live in milliseconds for items in the store */
  ttl?: number;
  
  /** Whether to persist the store to disk */
  persist?: boolean;
  
  /** Path to persist the store (if persistence is enabled) */
  persistPath?: string;
}
