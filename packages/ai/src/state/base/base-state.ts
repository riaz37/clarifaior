import { IState } from './state.interface';

export abstract class BaseState<T> implements IState<T> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  metadata: Record<string, unknown>;
  data: T;
  version: string;
  error?: { message: string; code?: string; details?: unknown };

  protected constructor(init: Partial<IState<T>> & { data: T }) {
    const now = new Date();
    this.id = init.id || this.generateId();
    this.createdAt = init.createdAt || now;
    this.updatedAt = init.updatedAt || now;
    this.status = init.status || 'idle';
    this.metadata = init.metadata || {};
    this.data = init.data;
    this.version = init.version || '1.0.0';
    this.error = init.error;
  }

  /**
   * Updates the state with new data
   * @param updates Partial state updates
   */
  update(updates: Partial<IState<T>>): void {
    Object.assign(this, { ...updates, updatedAt: new Date() });
  }

  /**
   * Updates the status of the state
   * @param status New status
   */
  setStatus(status: string): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  /**
   * Sets an error on the state
   * @param error Error information
   */
  setError(error: { message: string; code?: string; details?: unknown }): void {
    this.error = error;
    this.status = 'error';
    this.updatedAt = new Date();
  }

  /**
   * Clears any error from the state
   */
  clearError(): void {
    this.error = undefined;
    this.updatedAt = new Date();
  }

  /**
   * Updates the metadata with new values
   * @param metadata New metadata values
   */
  updateMetadata(metadata: Record<string, unknown>): void {
    this.metadata = { ...this.metadata, ...metadata };
    this.updatedAt = new Date();
  }

  /**
   * Creates a deep copy of the state
   */
  clone(): this {
    // @ts-ignore - We know the constructor exists
    return new this.constructor(JSON.parse(JSON.stringify(this)));
  }

  /**
   * Generates a unique ID for the state
   * @private
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export default BaseState;
