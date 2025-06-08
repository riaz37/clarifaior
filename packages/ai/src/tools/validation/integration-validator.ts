import { z } from 'zod';
import { SchemaValidator } from '../../utils/schema-validator';

// Define the HTTP method type
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Define the base endpoint config without method (for input)
interface BaseEndpointConfig {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  retry?: {
    maxAttempts: number;
    backoffFactor: number;
    maxDelay: number;
  };
  auth?: {
    type: 'basic' | 'bearer' | 'apiKey' | 'oauth2';
    [key: string]: any;
  };
  rateLimit?: {
    maxRequests: number;
    perSeconds: number;
  };
}

// Define the API endpoint config with required method (for output)
export interface ApiEndpointConfig extends Omit<BaseEndpointConfig, 'method'> {
  method: HttpMethod;
}

// Remove the duplicate EndpointConfigInput type as it's not needed

export interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  description?: string;
  baseUrl: string;
  endpoints: Record<string, ApiEndpointConfig>;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  enabled?: boolean; // Made optional to match the schema
  validateSsl?: boolean;
  metadata?: Record<string, any>;
}

const authSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('basic'),
    username: z.string(),
    password: z.string(),
  }),
  z.object({
    type: z.literal('bearer'),
    token: z.string(),
  }),
  z.object({
    type: z.literal('apiKey'),
    key: z.string(),
    value: z.string(),
    in: z.enum(['header', 'query']),
  }),
  z.object({
    type: z.literal('oauth2'),
    flow: z.enum(['client_credentials', 'password', 'authorization_code']),
    tokenUrl: z.string().url(),
    clientId: z.string(),
    clientSecret: z.string(),
    scopes: z.array(z.string()).optional(),
  }),
]);

// Define the endpoint schema with required fields and defaults
const endpointSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const).default('GET'),
  headers: z.record(z.string()).optional(),
  params: z.record(z.any()).optional(),
  timeout: z.number().positive('Timeout must be a positive number').optional(),
  retry: z.object({
    maxAttempts: z.number().int().positive('Max attempts must be a positive integer'),
    backoffFactor: z.number().positive('Backoff factor must be a positive number'),
    maxDelay: z.number().positive('Max delay must be a positive number'),
  }).optional(),
  auth: authSchema.optional(),
  rateLimit: z.object({
    maxRequests: z.number().int().positive('Max requests must be a positive integer'),
    perSeconds: z.number().int().positive('Per seconds must be a positive integer'),
  }).optional(),
}) as z.ZodType<ApiEndpointConfig>;

// Define the integration schema with proper typing
const integrationSchema = z.object({
  id: z.string().min(1, 'Integration ID is required'),
  name: z.string().min(1, 'Integration name is required'),
  type: z.string().min(1, 'Integration type is required'),
  description: z.string().optional(),
  baseUrl: z.string().url('Base URL must be a valid URL'),
  endpoints: z.record(endpointSchema).refine(
    (endpoints) => Object.keys(endpoints).length > 0,
    { message: 'At least one endpoint is required' }
  ),
  defaultHeaders: z.record(z.string()).optional(),
  timeout: z.number().positive('Timeout must be a positive number').optional(),
  enabled: z.boolean().default(true),
  validateSsl: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
}).refine(
  (data) => {
    // Ensure all endpoint URLs are valid when combined with baseUrl
    return Object.values(data.endpoints).every(endpoint => {
      try {
        new URL(endpoint.url, data.baseUrl);
        return true;
      } catch {
        return false;
      }
    });
  },
  {
    message: 'Endpoint URL must be a valid URL when combined with baseUrl',
    path: ['endpoints'],
  }
).transform((data) => {
  // Transform the data to ensure proper typing
  const result: IntegrationConfig = {
    ...data,
    enabled: data.enabled !== false, // Ensure boolean with default true
    validateSsl: data.validateSsl !== false, // Ensure boolean with default true
    endpoints: {}
  };

  // Transform each endpoint to ensure proper typing
  for (const [key, endpoint] of Object.entries(data.endpoints)) {
    result.endpoints[key] = {
      ...endpoint,
      method: endpoint.method as HttpMethod, // We know this is safe due to the enum
    };
  }

  return result;
});

export class IntegrationValidator {
  private static instance: IntegrationValidator;
  private constructor() {}

  public static getInstance(): IntegrationValidator {
    if (!IntegrationValidator.instance) {
      IntegrationValidator.instance = new IntegrationValidator();
    }
    return IntegrationValidator.instance;
  }

  /**
   * Validates an integration configuration
   * @throws {Error} If validation fails
   */
  public validateIntegration(config: unknown): IntegrationConfig {
    // First validate the input structure
    const validated = integrationSchema.parse(config);
    
    // Then ensure proper typing for the endpoints
    const endpoints: Record<string, ApiEndpointConfig> = {};
    for (const [key, endpoint] of Object.entries(validated.endpoints)) {
      // Create a properly typed endpoint with required method
      const typedEndpoint: ApiEndpointConfig = {
        ...endpoint,
        method: endpoint.method as HttpMethod, // Safe due to schema validation
      };
      endpoints[key] = typedEndpoint;
    }
    
    // Return the validated config with proper typing
    return {
      ...validated,
      endpoints,
      enabled: validated.enabled !== false, // default to true if not specified
    } as IntegrationConfig;
  }

  /**
   * Validates an API endpoint configuration
   * @throws {Error} If validation fails
   */
  public validateEndpoint(endpoint: unknown): ApiEndpointConfig {
    const result = SchemaValidator.validate(endpointSchema, endpoint, {
      errorMessage: 'Invalid endpoint configuration',
    });
    
    // Ensure method is always set (should be handled by schema, but just in case)
    return {
      ...result,
      method: result.method || 'GET' as HttpMethod,
    };
  }

  /**
   * Validates request parameters against a schema
   * @throws {ValidationError} If validation fails
   */
  public validateRequestParams<T = any>(
    params: unknown,
    schema: z.ZodType<T>
  ): T {
    return SchemaValidator.validate(schema, params, {
      errorMessage: 'Invalid request parameters',
    });
  }

  /**
   * Validates response data against a schema
   * @throws {ValidationError} If validation fails
   */
  public validateResponseData<T = any>(
    data: unknown,
    schema: z.ZodType<T>
  ): T {
    return SchemaValidator.validate(schema, data, {
      errorMessage: 'Invalid response data',
    });
  }

  /**
   * Validates that a URL is valid and optionally matches a base URL
   */
  public validateUrl(url: unknown, baseUrl?: string): boolean {
    try {
      if (typeof url !== 'string') return false;
      if (baseUrl && typeof baseUrl !== 'string') return false;
      
      // If baseUrl is provided, use it as the base for relative URLs
      if (baseUrl) {
        try {
          // Check if URL is absolute
          new URL(url);
          // If no error, it's an absolute URL, validate it directly
          return true;
        } catch (e) {
          // If error, it might be a relative URL, try with baseUrl
          new URL(url, baseUrl);
          return true;
        }
      } else {
        // No baseUrl, validate as absolute URL
        new URL(url);
        return true;
      }
    } catch {
      return false;
    }
  }
}

// Default validator instance
export const integrationValidator = IntegrationValidator.getInstance();