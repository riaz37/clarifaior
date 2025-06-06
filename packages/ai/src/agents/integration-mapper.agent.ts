import { BaseAgent } from './base/base-agent';
import { AgentConfig, AgentInput, AgentOutput, AgentExecution } from './base/agent.interface';
import { WorkflowDesign } from './workflow-designer.agent';

export interface IntegrationMappingInput {
  workflowDesign: WorkflowDesign;
  availableIntegrations: AvailableIntegration[];
  userPreferences?: UserIntegrationPreferences;
  constraints?: IntegrationConstraints;
}

export interface AvailableIntegration {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'active' | 'inactive' | 'deprecated';
  capabilities: IntegrationCapability[];
  authentication: AuthenticationMethod;
  rateLimits: RateLimit;
  pricing: PricingInfo;
  reliability: ReliabilityMetrics;
}

export interface IntegrationCapability {
  type: 'trigger' | 'action' | 'data_source' | 'data_sink';
  name: string;
  description: string;
  parameters: CapabilityParameter[];
  outputSchema?: any;
  inputSchema?: any;
  examples: CapabilityExample[];
}

export interface CapabilityParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  validation?: any;
  defaultValue?: any;
}

export interface CapabilityExample {
  name: string;
  description: string;
  input: any;
  output: any;
}

export interface AuthenticationMethod {
  type: 'oauth2' | 'api_key' | 'basic' | 'custom';
  scopes?: string[];
  permissions?: string[];
  setupComplexity: 'simple' | 'medium' | 'complex';
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit?: number;
}

export interface PricingInfo {
  model: 'free' | 'freemium' | 'paid' | 'usage_based';
  costPerRequest?: number;
  monthlyFee?: number;
  freeQuota?: number;
}

export interface ReliabilityMetrics {
  uptime: number; // percentage
  averageResponseTime: number; // ms
  errorRate: number; // percentage
  lastIncident?: Date;
}

export interface UserIntegrationPreferences {
  preferredIntegrations: string[];
  avoidedIntegrations: string[];
  costSensitivity: 'low' | 'medium' | 'high';
  reliabilityRequirement: 'low' | 'medium' | 'high';
  setupComplexityTolerance: 'simple' | 'medium' | 'complex';
}

export interface IntegrationConstraints {
  maxCostPerExecution?: number;
  maxSetupTime?: number;
  requiredUptime?: number;
  allowedIntegrations?: string[];
  forbiddenIntegrations?: string[];
  securityRequirements?: string[];
}

export interface IntegrationMapping {
  workflowId: string;
  mappings: StepMapping[];
  totalCost: number;
  estimatedReliability: number;
  setupComplexity: 'simple' | 'medium' | 'complex';
  requiredAuthentications: AuthenticationRequirement[];
  warnings: string[];
  recommendations: string[];
  confidence: number;
}

export interface StepMapping {
  stepId: string;
  stepName: string;
  selectedIntegration: AvailableIntegration;
  selectedCapability: IntegrationCapability;
  mappingReason: string;
  alternatives: AlternativeMapping[];
  confidence: number;
  estimatedCost: number;
  estimatedLatency: number;
}

export interface AlternativeMapping {
  integration: AvailableIntegration;
  capability: IntegrationCapability;
  score: number;
  reason: string;
}

export interface AuthenticationRequirement {
  integration: string;
  method: AuthenticationMethod;
  scopes: string[];
  setupInstructions: string;
}

export class IntegrationMapperAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      name: 'integration-mapper',
      description: 'Maps workflow steps to optimal integrations based on capabilities, cost, and reliability',
    });
  }

  protected async executeInternal(input: AgentInput, execution: AgentExecution): Promise<AgentOutput> {
    const mappingInput = input.input as IntegrationMappingInput;

    // Step 1: Analyze workflow requirements
    const requirements = await this.executeStep(
      'analyze-requirements',
      mappingInput.workflowDesign,
      execution,
      () => this.analyzeWorkflowRequirements(mappingInput.workflowDesign)
    );

    // Step 2: Score integrations for each step
    const integrationScores = await this.executeStep(
      'score-integrations',
      { requirements, integrations: mappingInput.availableIntegrations },
      execution,
      () => this.scoreIntegrationsForSteps(requirements, mappingInput)
    );

    // Step 3: Select optimal mappings
    const optimalMappings = await this.executeStep(
      'select-mappings',
      integrationScores,
      execution,
      () => this.selectOptimalMappings(integrationScores, mappingInput)
    );

    // Step 4: Validate and optimize
    const finalMapping = await this.executeStep(
      'validate-optimize',
      optimalMappings,
      execution,
      () => this.validateAndOptimize(optimalMappings, mappingInput)
    );

    return {
      output: finalMapping,
      confidence: finalMapping.confidence,
      reasoning: `Mapped ${finalMapping.mappings.length} steps with ${finalMapping.confidence * 100}% confidence`,
      tokensUsed: execution.steps.reduce((total, step) => total + (step.metadata?.tokensUsed || 0), 0),
      executionTime: Date.now() - execution.startTime.getTime()
    };
  }

  private async analyzeWorkflowRequirements(workflow: WorkflowDesign): Promise<any> {
    const prompt = `
Analyze this workflow to extract integration requirements:

Workflow: ${JSON.stringify(workflow, null, 2)}

For each step, identify:
1. Required capability type (trigger, action, data_source, data_sink)
2. Specific functionality needed
3. Input/output data requirements
4. Performance requirements (latency, throughput)
5. Reliability requirements
6. Security requirements
7. Cost sensitivity

Return structured requirements for each step.
`;

    return await this.callLLM(prompt, {
      temperature: 0.2,
      structured: true,
      schema: {
        type: 'object',
        properties: {
          trigger: {
            type: 'object',
            properties: {
              capabilityType: { type: 'string' },
              functionality: { type: 'string' },
              dataRequirements: { type: 'object' },
              performanceRequirements: { type: 'object' },
              reliabilityRequirements: { type: 'object' }
            }
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                stepId: { type: 'string' },
                capabilityType: { type: 'string' },
                functionality: { type: 'string' },
                dataRequirements: { type: 'object' },
                performanceRequirements: { type: 'object' },
                reliabilityRequirements: { type: 'object' }
              }
            }
          }
        }
      }
    });
  }

  private async scoreIntegrationsForSteps(
    requirements: any,
    input: IntegrationMappingInput
  ): Promise<any> {
    const scores = new Map();

    // Score each integration for each step
    for (const step of requirements.steps) {
      const stepScores = [];

      for (const integration of input.availableIntegrations) {
        const score = await this.scoreIntegrationForStep(step, integration, input);
        stepScores.push({
          integration,
          score,
          capabilities: this.findMatchingCapabilities(step, integration)
        });
      }

      // Sort by score (highest first)
      stepScores.sort((a, b) => b.score - a.score);
      scores.set(step.stepId, stepScores);
    }

    return scores;
  }

  private async scoreIntegrationForStep(
    stepRequirements: any,
    integration: AvailableIntegration,
    input: IntegrationMappingInput
  ): Promise<number> {
    let score = 0;

    // Capability match (40% of score)
    const capabilityScore = this.scoreCapabilityMatch(stepRequirements, integration);
    score += capabilityScore * 0.4;

    // Reliability (20% of score)
    const reliabilityScore = this.scoreReliability(integration, stepRequirements);
    score += reliabilityScore * 0.2;

    // Cost (20% of score)
    const costScore = this.scoreCost(integration, input.userPreferences);
    score += costScore * 0.2;

    // User preferences (10% of score)
    const preferenceScore = this.scoreUserPreferences(integration, input.userPreferences);
    score += preferenceScore * 0.1;

    // Setup complexity (10% of score)
    const setupScore = this.scoreSetupComplexity(integration, input.userPreferences);
    score += setupScore * 0.1;

    return Math.min(score, 1.0);
  }

  private scoreCapabilityMatch(stepRequirements: any, integration: AvailableIntegration): number {
    const matchingCapabilities = this.findMatchingCapabilities(stepRequirements, integration);
    
    if (matchingCapabilities.length === 0) return 0;

    // Score based on how well capabilities match requirements
    let totalScore = 0;
    for (const capability of matchingCapabilities) {
      let capabilityScore = 0.5; // Base score

      // Check if capability type matches
      if (capability.type === stepRequirements.capabilityType) {
        capabilityScore += 0.3;
      }

      // Check if functionality matches (using simple text similarity)
      const functionalityMatch = this.calculateTextSimilarity(
        stepRequirements.functionality,
        capability.description
      );
      capabilityScore += functionalityMatch * 0.2;

      totalScore = Math.max(totalScore, capabilityScore);
    }

    return Math.min(totalScore, 1.0);
  }

  private scoreReliability(integration: AvailableIntegration, requirements: any): number {
    const metrics = integration.reliability;
    let score = 0;

    // Uptime score
    score += (metrics.uptime / 100) * 0.4;

    // Response time score (lower is better)
    const responseTimeScore = Math.max(0, 1 - (metrics.averageResponseTime / 5000));
    score += responseTimeScore * 0.3;

    // Error rate score (lower is better)
    const errorRateScore = Math.max(0, 1 - (metrics.errorRate / 10));
    score += errorRateScore * 0.3;

    return score;
  }

  private scoreCost(integration: AvailableIntegration, preferences?: UserIntegrationPreferences): number {
    const pricing = integration.pricing;
    
    if (pricing.model === 'free') return 1.0;
    
    if (!preferences || preferences.costSensitivity === 'low') {
      return 0.8; // Don't penalize paid services much
    }

    if (preferences.costSensitivity === 'high') {
      if (pricing.model === 'freemium' && pricing.freeQuota && pricing.freeQuota > 100) {
        return 0.9;
      }
      return pricing.model === 'paid' ? 0.3 : 0.6;
    }

    return 0.7; // Medium cost sensitivity
  }

  private scoreUserPreferences(
    integration: AvailableIntegration,
    preferences?: UserIntegrationPreferences
  ): number {
    if (!preferences) return 0.5;

    if (preferences.preferredIntegrations.includes(integration.name)) {
      return 1.0;
    }

    if (preferences.avoidedIntegrations.includes(integration.name)) {
      return 0.0;
    }

    return 0.5;
  }

  private scoreSetupComplexity(
    integration: AvailableIntegration,
    preferences?: UserIntegrationPreferences
  ): number {
    const complexity = integration.authentication.setupComplexity;
    const tolerance = preferences?.setupComplexityTolerance || 'medium';

    if (tolerance === 'simple') {
      return complexity === 'simple' ? 1.0 : complexity === 'medium' ? 0.5 : 0.2;
    } else if (tolerance === 'complex') {
      return 1.0; // User is okay with any complexity
    } else {
      return complexity === 'simple' ? 1.0 : complexity === 'medium' ? 0.8 : 0.4;
    }
  }

  private findMatchingCapabilities(
    stepRequirements: any,
    integration: AvailableIntegration
  ): IntegrationCapability[] {
    return integration.capabilities.filter(capability => {
      // Basic type matching
      if (capability.type !== stepRequirements.capabilityType) {
        return false;
      }

      // Functionality matching (simple keyword matching)
      const functionalityMatch = this.calculateTextSimilarity(
        stepRequirements.functionality,
        capability.description
      );

      return functionalityMatch > 0.3;
    });
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple word overlap similarity
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  private async selectOptimalMappings(
    integrationScores: Map<string, any[]>,
    input: IntegrationMappingInput
  ): Promise<StepMapping[]> {
    const mappings: StepMapping[] = [];

    for (const [stepId, scores] of integrationScores.entries()) {
      if (scores.length === 0) continue;

      const bestOption = scores[0];
      const alternatives = scores.slice(1, 4); // Top 3 alternatives

      const step = input.workflowDesign.steps.find(s => s.id === stepId);
      if (!step) continue;

      const mapping: StepMapping = {
        stepId,
        stepName: step.name,
        selectedIntegration: bestOption.integration,
        selectedCapability: bestOption.capabilities[0], // Best matching capability
        mappingReason: `Selected for ${(bestOption.score * 100).toFixed(1)}% compatibility`,
        alternatives: alternatives.map(alt => ({
          integration: alt.integration,
          capability: alt.capabilities[0],
          score: alt.score,
          reason: `${(alt.score * 100).toFixed(1)}% compatibility`
        })),
        confidence: bestOption.score,
        estimatedCost: this.estimateStepCost(bestOption.integration),
        estimatedLatency: bestOption.integration.reliability.averageResponseTime
      };

      mappings.push(mapping);
    }

    return mappings;
  }

  private estimateStepCost(integration: AvailableIntegration): number {
    const pricing = integration.pricing;
    
    if (pricing.model === 'free') return 0;
    if (pricing.costPerRequest) return pricing.costPerRequest;
    if (pricing.monthlyFee) return pricing.monthlyFee / 1000; // Estimate per execution
    
    return 0.01; // Default estimate
  }

  private async validateAndOptimize(
    mappings: StepMapping[],
    input: IntegrationMappingInput
  ): Promise<IntegrationMapping> {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check for conflicts and issues
    const integrationUsage = new Map<string, number>();
    let totalCost = 0;
    let totalLatency = 0;

    for (const mapping of mappings) {
      // Track integration usage
      const integrationName = mapping.selectedIntegration.name;
      integrationUsage.set(integrationName, (integrationUsage.get(integrationName) || 0) + 1);

      // Accumulate costs and latency
      totalCost += mapping.estimatedCost;
      totalLatency += mapping.estimatedLatency;

      // Check rate limits
      if (mapping.selectedIntegration.rateLimits.requestsPerMinute < 10) {
        warnings.push(`${integrationName} has low rate limits (${mapping.selectedIntegration.rateLimits.requestsPerMinute}/min)`);
      }

      // Check reliability
      if (mapping.selectedIntegration.reliability.uptime < 99) {
        warnings.push(`${integrationName} has lower reliability (${mapping.selectedIntegration.reliability.uptime}% uptime)`);
      }
    }

    // Generate recommendations
    if (totalCost > 1.0) {
      recommendations.push('Consider using more cost-effective integrations to reduce execution cost');
    }

    if (totalLatency > 10000) {
      recommendations.push('Workflow may have high latency due to slow integrations');
    }

    // Calculate overall confidence
    const averageConfidence = mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length;

    // Determine setup complexity
    const complexities = mappings.map(m => m.selectedIntegration.authentication.setupComplexity);
    const setupComplexity = complexities.includes('complex') ? 'complex' : 
                           complexities.includes('medium') ? 'medium' : 'simple';

    // Calculate estimated reliability
    const reliabilities = mappings.map(m => m.selectedIntegration.reliability.uptime);
    const estimatedReliability = reliabilities.reduce((min, r) => Math.min(min, r), 100);

    // Generate authentication requirements
    const requiredAuthentications: AuthenticationRequirement[] = [];
    const uniqueIntegrations = new Set(mappings.map(m => m.selectedIntegration.name));
    
    for (const integrationName of uniqueIntegrations) {
      const integration = mappings.find(m => m.selectedIntegration.name === integrationName)?.selectedIntegration;
      if (integration) {
        requiredAuthentications.push({
          integration: integrationName,
          method: integration.authentication,
          scopes: integration.authentication.scopes || [],
          setupInstructions: `Set up ${integration.authentication.type} authentication for ${integrationName}`
        });
      }
    }

    return {
      workflowId: input.workflowDesign.name,
      mappings,
      totalCost,
      estimatedReliability,
      setupComplexity,
      requiredAuthentications,
      warnings,
      recommendations,
      confidence: averageConfidence
    };
  }
}