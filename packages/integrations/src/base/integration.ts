export interface IntegrationConfig {
  name: string;
  type: string;
  credentials: Record<string, any>;
  settings?: Record<string, any>;
}

export interface IntegrationResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export abstract class BaseIntegration {
  protected config: IntegrationConfig;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  abstract authenticate(): Promise<IntegrationResponse<boolean>>;
  abstract execute(action: string, params: any): Promise<IntegrationResponse>;
  abstract testConnection(): Promise<IntegrationResponse<boolean>>;

  getName(): string {
    return this.config.name;
  }

  getType(): string {
    return this.config.type;
  }
}
