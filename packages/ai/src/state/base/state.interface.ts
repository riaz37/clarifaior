export interface IState<T> {
  // Unique identifier for the state
  id: string;
  // Timestamp when the state was created
  createdAt: Date;
  // Timestamp when the state was last updated
  updatedAt: Date;
  // Current status of the state
  status: string;
  // Metadata associated with the state
  metadata: Record<string, unknown>;
  // The actual state data
  data: T;
  // Version of the state schema
  version: string;
  // Optional error information if the state is in an error state
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}
