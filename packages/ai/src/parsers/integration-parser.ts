import BaseParser from './base/base-parser';

export interface AuthConfig {
  type: 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'custom';
  [key: string]: any;
}

export interface EndpointConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer' | 'stream';
  timeout?: number;
  retry?: {
    attempts: number;
    delay?: number;
    backoff?: boolean;
  };
}

export interface ActionConfig {
  name: string;
  description?: string;
  endpoint: string | EndpointConfig;
  inputSchema?: any;
  outputSchema?: any;
  requiresAuth?: boolean;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  description?: string;
  version: string;
  baseUrl?: string;
  auth: AuthConfig;
  endpoints: Record<string, EndpointConfig>;
  actions: Record<string, ActionConfig>;
  defaultHeaders?: Record<string, string>;
  rateLimit?: {
    maxRequests: number;
    perSeconds: number;
  };
  metadata?: {
    categories?: string[];
    logoUrl?: string;
    documentationUrl?: string;
    status?: 'active' | 'beta' | 'deprecated';
  };
}

export interface IntegrationParserOptions {
  /** Whether to validate the integration configuration */
  validate?: boolean;
  /** Whether to resolve references in the configuration */
  resolveReferences?: boolean;
  /** Custom validators for integration components */
  validators?: {
    auth?: (config: AuthConfig) => string | null;
    endpoint?: (endpoint: EndpointConfig) => string | null;
    action?: (action: ActionConfig, integration: IntegrationConfig) => string | null;
  };
}

/**
 * Parser for integration configurations
 */
export class IntegrationParser extends BaseParser<IntegrationConfig, IntegrationConfig> {
  private options: Required<IntegrationParserOptions>;
  private static readonly DEFAULT_AUTH_TYPES = [
    'api_key',
    'oauth2',
    'basic',
    'bearer',
    'custom',
  ];

  private static readonly DEFAULT_HTTP_METHODS = [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'HEAD',
    'OPTIONS',
  ];

  constructor(options: IntegrationParserOptions = {}) {
    super();
    this.options = {
      validate: options.validate ?? true,
      resolveReferences: options.resolveReferences ?? true,
      validators: {
        auth: options.validators?.auth,
        endpoint: options.validators?.endpoint,
        action: options.validators?.action,
      },
    };
  }

  /**
   * Parses and validates an integration configuration
   * @param config The integration configuration to parse
   * @returns The parsed and validated integration configuration
   */
  async parse(config: IntegrationConfig): Promise<IntegrationConfig> {
    this.validateInput(config);

    if (this.options.validate) {
      this.validateIntegrationConfig(config);
    }

    if (this.options.resolveReferences) {
      this.resolveEndpointReferences(config);
    }

    return config;
  }

  /**
   * Validates the integration configuration structure
   * @private
   */
  private validateIntegrationConfig(config: IntegrationConfig): void {
    // Validate required top-level fields
    if (!config.id) {
      throw new Error('Integration must have an id');
    }

    if (!config.name) {
      throw new Error('Integration must have a name');
    }

    if (!config.version) {
      throw new Error('Integration must have a version');
    }

    // Validate auth configuration
    this.validateAuthConfig(config.auth);

    // Validate endpoints
    if (config.endpoints) {
      for (const [endpointId, endpoint] of Object.entries(config.endpoints)) {
        this.validateEndpoint(endpointId, endpoint, config);
      }
    }

    // Validate actions
    if (config.actions) {
      for (const [actionId, action] of Object.entries(config.actions)) {
        this.validateAction(actionId, action, config);
      }
    }
  }

  /**
   * Validates the authentication configuration
   * @private
   */
  private validateAuthConfig(auth: AuthConfig): void {
    if (!auth) {
      throw new Error('Integration must have an auth configuration');
    }

    if (!auth.type) {
      throw new Error('Auth configuration must specify a type');
    }

    if (!IntegrationParser.DEFAULT_AUTH_TYPES.includes(auth.type)) {
      throw new Error(
        `Invalid auth type '${auth.type}'. Must be one of: ${IntegrationParser.DEFAULT_AUTH_TYPES.join(', ')}`
      );
    }

    // Run custom auth validator if provided
    if (this.options.validators?.auth) {
      const error = this.options.validators.auth(auth);
      if (error) {
        throw new Error(`Auth validation failed: ${error}`);
      }
    }
  }

  /**
   * Validates an endpoint configuration
   * @private
   */
  private validateEndpoint(
    endpointId: string,
    endpoint: EndpointConfig,
    integration: IntegrationConfig
  ): void {
    if (!endpoint.url) {
      throw new Error(`Endpoint '${endpointId}' is missing required field 'url'`);
    }

    if (!endpoint.method) {
      throw new Error(`Endpoint '${endpointId}' is missing required field 'method'`);
    }

    if (!IntegrationParser.DEFAULT_HTTP_METHODS.includes(endpoint.method)) {
      throw new Error(
        `Invalid method '${endpoint.method}' for endpoint '${endpointId}'. ` +
        `Must be one of: ${IntegrationParser.DEFAULT_HTTP_METHODS.join(', ')}`
      );
    }

    // Run custom endpoint validator if provided
    if (this.options.validators?.endpoint) {
      const error = this.options.validators.endpoint(endpoint);
      if (error) {
        throw new Error(`Endpoint '${endpointId}' validation failed: ${error}`);
      }
    }
  }

  /**
   * Validates an action configuration
   * @private
   */
  private validateAction(
    actionId: string,
    action: ActionConfig,
    integration: IntegrationConfig
  ): void {
    if (!action.name) {
      throw new Error(`Action '${actionId}' is missing required field 'name'`);
    }

    if (!action.endpoint) {
      throw new Error(`Action '${actionId}' is missing required field 'endpoint'`);
    }

    // If endpoint is a string, it should reference a defined endpoint
    if (typeof action.endpoint === 'string') {
      const endpointId = action.endpoint;
      if (!integration.endpoints || !integration.endpoints[endpointId]) {
        throw new Error(
          `Action '${actionId}' references undefined endpoint '${endpointId}'`
        );
      }
    } else {
      // If endpoint is an object, validate it as an inline endpoint
      this.validateEndpoint(`action:${actionId}`, action.endpoint, integration);
    }

    // Run custom action validator if provided
    if (this.options.validators?.action) {
      const error = this.options.validators.action(action, integration);
      if (error) {
        throw new Error(`Action '${actionId}' validation failed: ${error}`);
      }
    }
  }

  /**
   * Resolves endpoint references in the integration configuration
   * @private
   */
  private resolveEndpointReferences(config: IntegrationConfig): void {
    if (!config.actions) return;

    for (const action of Object.values(config.actions)) {
      if (typeof action.endpoint === 'string') {
        const endpointId = action.endpoint;
        if (config.endpoints && config.endpoints[endpointId]) {
          // Replace the endpoint string reference with the actual endpoint config
          action.endpoint = { ...config.endpoints[endpointId] };
        }
      }
    }
  }
}

export default IntegrationParser;