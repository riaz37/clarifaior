import { BaseAgent } from './base/base-agent';
import { AgentConfig, AgentInput, AgentOutput, AgentExecution } from './base/agent.interface';
import { WorkflowDesign } from './workflow-designer.agent';
import { IntegrationMapping } from './integration-mapper.agent';

export interface ValidationInput {
  workflowDesign: WorkflowDesign;
  integrationMapping?: IntegrationMapping;
  validationLevel: 'basic' | 'comprehensive' | 'production';
  context?: ValidationContext;
}

export interface ValidationContext {
  userPermissions: string[];
  organizationPolicies: Policy[];
  securityRequirements: SecurityRequirement[];
  complianceStandards: string[];
  budgetConstraints: BudgetConstraint[];
}

export interface Policy {
  id: string;
  name: string;
  type: 'security' | 'compliance' | 'operational' | 'cost';
  rules: PolicyRule[];
  severity: 'error' | 'warning' | 'info';
}

export interface PolicyRule {
  condition: string;
  action: 'allow' | 'deny' | 'require_approval';
  message: string;
}

export interface SecurityRequirement {
  type: 'encryption' | 'authentication' | 'authorization' | 'audit' | 'data_protection';
  level: 'basic' | 'standard' | 'high' | 'critical';
  requirements: string[];
}

export interface BudgetConstraint {
  type: 'per_execution' | 'monthly' | 'annual';
  limit: number;
  currency: string;
  alertThreshold: number;
}

export interface ValidationResult {
  isValid: boolean;
  overallScore: number;
  validationLevel: string;
  categories: ValidationCategory[];
  summary: ValidationSummary;
  recommendations: Recommendation[];
  requiredActions: RequiredAction[];
  confidence: number;
}

export interface ValidationCategory {
  name: string;
  type: 'structure' | 'security' | 'performance' | 'cost' | 'compliance' | 'usability';
  score: number;
  status: 'pass' | 'warning' | 'error';
  issues: ValidationIssue[];
  checks: ValidationCheck[];
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  location: string;
  suggestion: string;
  autoFixable: boolean;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationCheck {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  details?: any;
}

export interface ValidationSummary {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  passedChecks: number;
  totalChecks: number;
  estimatedFixTime: number; // minutes
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface Recommendation {
  id: string;
  type: 'optimization' | 'security' | 'cost' | 'performance' | 'usability';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  benefits: string[];
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface RequiredAction {
  id: string;
  type: 'fix_error' | 'approve_risk' | 'configure_integration' | 'update_permissions';
  title: string;
  description: string;
  deadline?: Date;
  assignee?: string;
  dependencies: string[];
}

export class ValidatorAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      name: 'validator',
      description: 'Validates workflows for correctness, security, performance, and compliance',
    });
  }

  protected async executeInternal(input: AgentInput, execution: AgentExecution): Promise<AgentOutput> {
    const validationInput = input.input as ValidationInput;

    // Step 1: Structural validation
    const structuralValidation = await this.executeStep(
      'validate-structure',
      validationInput.workflowDesign,
      execution,
      () => this.validateStructure(validationInput.workflowDesign)
    );

    // Step 2: Security validation
    const securityValidation = await this.executeStep(
      'validate-security',
      { workflow: validationInput.workflowDesign, context: validationInput.context },
      execution,
      () => this.validateSecurity(validationInput.workflowDesign, validationInput.context)
    );

    // Step 3: Performance validation
    const performanceValidation = await this.executeStep(
      'validate-performance',
      { workflow: validationInput.workflowDesign, mapping: validationInput.integrationMapping },
      execution,
      () => this.validatePerformance(validationInput.workflowDesign, validationInput.integrationMapping)
    );

    // Step 4: Cost validation
    const costValidation = await this.executeStep(
      'validate-cost',
      { workflow: validationInput.workflowDesign, mapping: validationInput.integrationMapping, context: validationInput.context },
      execution,
      () => this.validateCost(validationInput.workflowDesign, validationInput.integrationMapping, validationInput.context)
    );

    // Step 5: Compliance validation
    const complianceValidation = await this.executeStep(
      'validate-compliance',
      { workflow: validationInput.workflowDesign, context: validationInput.context },
      execution,
      () => this.validateCompliance(validationInput.workflowDesign, validationInput.context)
    );

    // Step 6: Usability validation
    const usabilityValidation = await this.executeStep(
      'validate-usability',
      validationInput.workflowDesign,
      execution,
      () => this.validateUsability(validationInput.workflowDesign)
    );

    // Step 7: Compile final results
    const finalResult = await this.executeStep(
      'compile-results',
      {
        structural: structuralValidation,
        security: securityValidation,
        performance: performanceValidation,
        cost: costValidation,
        compliance: complianceValidation,
        usability: usabilityValidation
      },
      execution,
      () => this.compileValidationResults([
        structuralValidation,
        securityValidation,
        performanceValidation,
        costValidation,
        complianceValidation,
        usabilityValidation
      ], validationInput)
    );

    return {
      output: finalResult,
      confidence: finalResult.confidence,
      reasoning: `Validated workflow with ${finalResult.summary.totalIssues} issues found (${finalResult.summary.errorCount} errors, ${finalResult.summary.warningCount} warnings)`,
      tokensUsed: execution.steps.reduce((total, step) => total + (step.metadata?.tokensUsed || 0), 0),
      executionTime: Date.now() - execution.startTime.getTime()
    };
  }

  private async validateStructure(workflow: WorkflowDesign): Promise<ValidationCategory> {
    const issues: ValidationIssue[] = [];
    const checks: ValidationCheck[] = [];

    // Check 1: Workflow has a trigger
    if (!workflow.trigger || !workflow.trigger.type) {
      issues.push({
        id: 'missing-trigger',
        severity: 'error',
        category: 'structure',
        title: 'Missing Workflow Trigger',
        description: 'Workflow must have a trigger to define when it should execute',
        location: 'workflow.trigger',
        suggestion: 'Add a trigger configuration (email, webhook, schedule, etc.)',
        autoFixable: false,
        impact: 'critical'
      });
      checks.push({ name: 'Has Trigger', status: 'fail', message: 'No trigger defined' });
    } else {
      checks.push({ name: 'Has Trigger', status: 'pass', message: `Trigger type: ${workflow.trigger.type}` });
    }

    // Check 2: Workflow has steps
    if (!workflow.steps || workflow.steps.length === 0) {
      issues.push({
        id: 'no-steps',
        severity: 'error',
        category: 'structure',
        title: 'No Workflow Steps',
        description: 'Workflow must have at least one step to perform actions',
        location: 'workflow.steps',
        suggestion: 'Add action steps to define what the workflow should do',
        autoFixable: false,
        impact: 'critical'
      });
      checks.push({ name: 'Has Steps', status: 'fail', message: 'No steps defined' });
    } else {
      checks.push({ name: 'Has Steps', status: 'pass', message: `${workflow.steps.length} steps defined` });
    }

    // Check 3: Step IDs are unique
    const stepIds = workflow.steps.map(s => s.id);
    const duplicateIds = stepIds.filter((id, index) => stepIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      issues.push({
        id: 'duplicate-step-ids',
        severity: 'error',
        category: 'structure',
        title: 'Duplicate Step IDs',
        description: 'Each step must have a unique identifier',
        location: 'workflow.steps',
        suggestion: `Rename duplicate step IDs: ${duplicateIds.join(', ')}`,
        autoFixable: true,
        impact: 'high'
      });
      checks.push({ name: 'Unique Step IDs', status: 'fail', message: `Duplicate IDs: ${duplicateIds.join(', ')}` });
    } else {
      checks.push({ name: 'Unique Step IDs', status: 'pass', message: 'All step IDs are unique' });
    }

    // Check 4: Step references are valid
    const invalidReferences: string[] = [];
    workflow.steps.forEach(step => {
      if (step.onSuccess && !stepIds.includes(step.onSuccess)) {
        invalidReferences.push(`${step.id}.onSuccess -> ${step.onSuccess}`);
      }
      if (step.onFailure && !stepIds.includes(step.onFailure)) {
        invalidReferences.push(`${step.id}.onFailure -> ${step.onFailure}`);
      }
    });

    if (invalidReferences.length > 0) {
      issues.push({
        id: 'invalid-step-references',
        severity: 'error',
        category: 'structure',
        title: 'Invalid Step References',
        description: 'Steps reference non-existent step IDs',
        location: 'workflow.steps',
        suggestion: `Fix invalid references: ${invalidReferences.join(', ')}`,
        autoFixable: true,
        impact: 'high'
      });
      checks.push({ name: 'Valid Step References', status: 'fail', message: `Invalid references: ${invalidReferences.length}` });
    } else {
      checks.push({ name: 'Valid Step References', status: 'pass', message: 'All step references are valid' });
    }

    // Check 5: No circular dependencies
    const hasCircularDependency = this.detectCircularDependencies(workflow.steps);
    if (hasCircularDependency) {
      issues.push({
        id: 'circular-dependencies',
        severity: 'warning',
        category: 'structure',
        title: 'Circular Dependencies Detected',
        description: 'Workflow may have circular dependencies that could cause infinite loops',
        location: 'workflow.steps',
        suggestion: 'Review step flow and remove circular references',
        autoFixable: false,
        impact: 'medium'
      });
      checks.push({ name: 'No Circular Dependencies', status: 'fail', message: 'Circular dependencies detected' });
    } else {
      checks.push({ name: 'No Circular Dependencies', status: 'pass', message: 'No circular dependencies found' });
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const score = Math.max(0, 1 - (errorCount * 0.3) - (issues.filter(i => i.severity === 'warning').length * 0.1));

    return {
      name: 'Structural Validation',
      type: 'structure',
      score,
      status: errorCount > 0 ? 'error' : issues.length > 0 ? 'warning' : 'pass',
      issues,
      checks
    };
  }

  private async validateSecurity(workflow: WorkflowDesign, context?: ValidationContext): Promise<ValidationCategory> {
    const issues: ValidationIssue[] = [];
    const checks: ValidationCheck[] = [];

    // Check 1: Required permissions
    const requiredPermissions = workflow.metadata?.requiredPermissions || [];
    const userPermissions = context?.userPermissions || [];
    const missingPermissions = requiredPermissions.filter(p => !userPermissions.includes(p));

    if (missingPermissions.length > 0) {
      issues.push({
        id: 'missing-permissions',
        severity: 'error',
        category: 'security',
        title: 'Missing Required Permissions',
        description: 'User lacks required permissions to execute this workflow',
        location: 'workflow.metadata.requiredPermissions',
        suggestion: `Grant permissions: ${missingPermissions.join(', ')}`,
        autoFixable: false,
        impact: 'critical'
      });
      checks.push({ name: 'Required Permissions', status: 'fail', message: `Missing: ${missingPermissions.join(', ')}` });
    } else {
      checks.push({ name: 'Required Permissions', status: 'pass', message: 'All required permissions available' });
    }

    // Check 2: Sensitive data handling
    const sensitiveDataSteps = workflow.steps.filter(step => 
      this.containsSensitiveData(step.parameters)
    );

    if (sensitiveDataSteps.length > 0) {
      issues.push({
        id: 'sensitive-data-exposure',
        severity: 'warning',
        category: 'security',
        title: 'Potential Sensitive Data Exposure',
        description: 'Workflow may handle sensitive data without proper protection',
        location: 'workflow.steps',
        suggestion: 'Review data handling and add encryption/masking where needed',
        autoFixable: false,
        impact: 'high'
      });
      checks.push({ name: 'Sensitive Data Protection', status: 'fail', message: `${sensitiveDataSteps.length} steps may expose sensitive data` });
    } else {
      checks.push({ name: 'Sensitive Data Protection', status: 'pass', message: 'No sensitive data exposure detected' });
    }

    // Check 3: External API security
    const externalApiSteps = workflow.steps.filter(step => 
      step.integration && !this.isTrustedIntegration(step.integration)
    );

    if (externalApiSteps.length > 0) {
      issues.push({
        id: 'untrusted-integrations',
        severity: 'warning',
        category: 'security',
        title: 'Untrusted External Integrations',
        description: 'Workflow uses integrations that may not meet security standards',
        location: 'workflow.steps',
        suggestion: 'Review integration security and consider alternatives',
        autoFixable: false,
        impact: 'medium'
      });
      checks.push({ name: 'Trusted Integrations', status: 'fail', message: `${externalApiSteps.length} untrusted integrations` });
    } else {
      checks.push({ name: 'Trusted Integrations', status: 'pass', message: 'All integrations are trusted' });
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const score = Math.max(0, 1 - (errorCount * 0.4) - (issues.filter(i => i.severity === 'warning').length * 0.15));

    return {
      name: 'Security Validation',
      type: 'security',
      score,
      status: errorCount > 0 ? 'error' : issues.length > 0 ? 'warning' : 'pass',
      issues,
      checks
    };
  }

  private async validatePerformance(workflow: WorkflowDesign, mapping?: IntegrationMapping): Promise<ValidationCategory> {
    const issues: ValidationIssue[] = [];
    const checks: ValidationCheck[] = [];

    // Check 1: Estimated execution time
    const estimatedTime = workflow.metadata?.estimatedExecutionTime || 0;
    if (estimatedTime > 300000) { // 5 minutes
      issues.push({
        id: 'long-execution-time',
        severity: 'warning',
        category: 'performance',
        title: 'Long Execution Time',
        description: 'Workflow may take a long time to execute',
        location: 'workflow.metadata.estimatedExecutionTime',
        suggestion: 'Consider optimizing steps or adding parallel execution',
        autoFixable: false,
        impact: 'medium'
      });
      checks.push({ name: 'Execution Time', status: 'fail', message: `Estimated ${estimatedTime/1000}s execution time` });
    } else {
      checks.push({ name: 'Execution Time', status: 'pass', message: `Estimated ${estimatedTime/1000}s execution time` });
    }

    // Check 2: Rate limiting concerns
    if (mapping) {
      const rateLimitIssues = mapping.mappings.filter(m => 
        m.selectedIntegration.rateLimits.requestsPerMinute < 10
      );

      if (rateLimitIssues.length > 0) {
        issues.push({
          id: 'rate-limit-concerns',
          severity: 'warning',
          category: 'performance',
          title: 'Rate Limiting Concerns',
          description: 'Some integrations have low rate limits that may cause delays',
          location: 'integrationMapping.mappings',
          suggestion: 'Consider using integrations with higher rate limits',
          autoFixable: false,
          impact: 'medium'
        });
        checks.push({ name: 'Rate Limits', status: 'fail', message: `${rateLimitIssues.length} integrations with low limits` });
      } else {
        checks.push({ name: 'Rate Limits', status: 'pass', message: 'All integrations have adequate rate limits' });
      }
    }

    // Check 3: Parallel execution opportunities
    const parallelOpportunities = this.identifyParallelExecutionOpportunities(workflow.steps);
    if (parallelOpportunities.length > 0) {
      issues.push({
        id: 'parallel-execution-opportunity',
        severity: 'info',
        category: 'performance',
        title: 'Parallel Execution Opportunity',
        description: 'Some steps could be executed in parallel to improve performance',
        location: 'workflow.steps',
        suggestion: `Consider parallelizing steps: ${parallelOpportunities.join(', ')}`,
        autoFixable: true,
        impact: 'low'
      });
      checks.push({ name: 'Parallel Execution', status: 'fail', message: `${parallelOpportunities.length} optimization opportunities` });
    } else {
      checks.push({ name: 'Parallel Execution', status: 'pass', message: 'Workflow is optimally structured' });
    }

    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const score = Math.max(0, 1 - (warningCount * 0.2));

    return {
      name: 'Performance Validation',
      type: 'performance',
      score,
      status: warningCount > 0 ? 'warning' : 'pass',
      issues,
      checks
    };
  }

  private async validateCost(
    workflow: WorkflowDesign,
    mapping?: IntegrationMapping,
    context?: ValidationContext
  ): Promise<ValidationCategory> {
    const issues: ValidationIssue[] = [];
    const checks: ValidationCheck[] = [];

    if (mapping && context?.budgetConstraints) {
      const totalCost = mapping.totalCost;
      
      for (const constraint of context.budgetConstraints) {
        if (constraint.type === 'per_execution' && totalCost > constraint.limit) {
          issues.push({
            id: 'exceeds-execution-budget',
            severity: 'error',
            category: 'cost',
            title: 'Exceeds Execution Budget',
            description: `Estimated cost (${totalCost}) exceeds budget limit (${constraint.limit})`,
            location: 'integrationMapping.totalCost',
            suggestion: 'Use more cost-effective integrations or reduce workflow complexity',
            autoFixable: false,
            impact: 'high'
          });
          checks.push({ name: 'Execution Budget', status: 'fail', message: `Cost ${totalCost} > limit ${constraint.limit}` });
        } else if (constraint.type === 'per_execution' && totalCost > constraint.alertThreshold) {
          issues.push({
            id: 'approaching-execution-budget',
            severity: 'warning',
            category: 'cost',
            title: 'Approaching Execution Budget',
            description: `Estimated cost is approaching budget limit`,
            location: 'integrationMapping.totalCost',
            suggestion: 'Monitor costs and consider optimization',
            autoFixable: false,
            impact: 'medium'
          });
          checks.push({ name: 'Execution Budget', status: 'fail', message: `Cost ${totalCost} approaching limit` });
        } else {
          checks.push({ name: 'Execution Budget', status: 'pass', message: `Cost ${totalCost} within budget` });
        }
      }
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const score = Math.max(0, 1 - (errorCount * 0.5) - (issues.filter(i => i.severity === 'warning').length * 0.2));

    return {
      name: 'Cost Validation',
      type: 'cost',
      score,
      status: errorCount > 0 ? 'error' : issues.length > 0 ? 'warning' : 'pass',
      issues,
      checks
    };
  }

  private async validateCompliance(workflow: WorkflowDesign, context?: ValidationContext): Promise<ValidationCategory> {
    const issues: ValidationIssue[] = [];
    const checks: ValidationCheck[] = [];

    if (context?.organizationPolicies) {
      for (const policy of context.organizationPolicies) {
        const violations = this.checkPolicyCompliance(workflow, policy);
        if (violations.length > 0) {
          issues.push({
            id: `policy-violation-${policy.id}`,
            severity: policy.severity,
            category: 'compliance',
            title: `Policy Violation: ${policy.name}`,
            description: `Workflow violates organizational policy`,
            location: 'workflow',
            suggestion: violations.join('; '),
            autoFixable: false,
            impact: policy.severity === 'error' ? 'critical' : 'medium'
          });
          checks.push({ name: `Policy: ${policy.name}`, status: 'fail', message: `${violations.length} violations` });
        } else {
          checks.push({ name: `Policy: ${policy.name}`, status: 'pass', message: 'Compliant' });
        }
      }
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const score = Math.max(0, 1 - (errorCount * 0.4) - (issues.filter(i => i.severity === 'warning').length * 0.2));

    return {
      name: 'Compliance Validation',
      type: 'compliance',
      score,
      status: errorCount > 0 ? 'error' : issues.length > 0 ? 'warning' : 'pass',
      issues,
      checks
    };
  }

  private async validateUsability(workflow: WorkflowDesign): Promise<ValidationCategory> {
    const issues: ValidationIssue[] = [];
    const checks: ValidationCheck[] = [];

    // Check 1: Workflow has a clear name
    if (!workflow.name || workflow.name.trim().length < 3) {
      issues.push({
        id: 'unclear-name',
        severity: 'warning',
        category: 'usability',
        title: 'Unclear Workflow Name',
        description: 'Workflow should have a clear, descriptive name',
        location: 'workflow.name',
        suggestion: 'Provide a descriptive name that explains what the workflow does',
        autoFixable: false,
        impact: 'low'
      });
      checks.push({ name: 'Clear Name', status: 'fail', message: 'Name is too short or missing' });
    } else {
      checks.push({ name: 'Clear Name', status: 'pass', message: 'Workflow has a clear name' });
    }

    // Check 2: Workflow has a description
    if (!workflow.description || workflow.description.trim().length < 10) {
      issues.push({
        id: 'missing-description',
        severity: 'info',
        category: 'usability',
        title: 'Missing Description',
        description: 'Workflow should have a description explaining its purpose',
        location: 'workflow.description',
        suggestion: 'Add a description that explains what the workflow does and when it runs',
        autoFixable: false,
        impact: 'low'
      });
      checks.push({ name: 'Has Description', status: 'fail', message: 'Description is missing or too short' });
    } else {
      checks.push({ name: 'Has Description', status: 'pass', message: 'Workflow has a description' });
    }

    // Check 3: Steps have clear names
    const unclearSteps = workflow.steps.filter(step => 
      !step.name || step.name.trim().length < 3
    );

    if (unclearSteps.length > 0) {
      issues.push({
        id: 'unclear-step-names',
        severity: 'info',
        category: 'usability',
        title: 'Unclear Step Names',
        description: 'Some steps have unclear or missing names',
        location: 'workflow.steps',
        suggestion: 'Give each step a clear, descriptive name',
        autoFixable: false,
        impact: 'low'
      });
      checks.push({ name: 'Clear Step Names', status: 'fail', message: `${unclearSteps.length} steps with unclear names` });
    } else {
      checks.push({ name: 'Clear Step Names', status: 'pass', message: 'All steps have clear names' });
    }

    const score = Math.max(0, 1 - (issues.length * 0.1));

    return {
      name: 'Usability Validation',
      type: 'usability',
      score,
      status: issues.length > 0 ? 'warning' : 'pass',
      issues,
      checks
    };
  }

  private compileValidationResults(
    categories: ValidationCategory[],
    input: ValidationInput
  ): ValidationResult {
    const allIssues = categories.flatMap(c => c.issues);
    const allChecks = categories.flatMap(c => c.checks);

    const errorCount = allIssues.filter(i => i.severity === 'error').length;
    const warningCount = allIssues.filter(i => i.severity === 'warning').length;
    const infoCount = allIssues.filter(i => i.severity === 'info').length;
    const passedChecks = allChecks.filter(c => c.status === 'pass').length;

    const overallScore = categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length;
    const isValid = errorCount === 0;

    // Generate recommendations
    const recommendations: Recommendation[] = [];
    if (warningCount > 0) {
      recommendations.push({
        id: 'fix-warnings',
        type: 'optimization',
        priority: 'medium',
        title: 'Address Warning Issues',
        description: `Fix ${warningCount} warning issues to improve workflow quality`,
        benefits: ['Improved reliability', 'Better performance'],
        effort: 'medium',
        impact: 'medium'
      });
    }

    // Generate required actions
    const requiredActions: RequiredAction[] = [];
    const errorIssues = allIssues.filter(i => i.severity === 'error');
    if (errorIssues.length > 0) {
      requiredActions.push({
        id: 'fix-errors',
        type: 'fix_error',
        title: 'Fix Critical Errors',
        description: `${errorIssues.length} critical errors must be fixed before deployment`,
        dependencies: []
      });
    }

    const summary: ValidationSummary = {
      totalIssues: allIssues.length,
      errorCount,
      warningCount,
      infoCount,
      passedChecks,
      totalChecks: allChecks.length,
      estimatedFixTime: this.estimateFixTime(allIssues),
      riskLevel: this.calculateRiskLevel(errorCount, warningCount)
    };

    return {
      isValid,
      overallScore,
      validationLevel: input.validationLevel,
      categories,
      summary,
      recommendations,
      requiredActions,
      confidence: Math.min(overallScore + 0.1, 0.95)
    };
  }

  // Helper methods
  private detectCircularDependencies(steps: any[]): boolean {
    // Simple cycle detection using DFS
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) return true;
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step) {
        if (step.onSuccess && hasCycle(step.onSuccess)) return true;
        if (step.onFailure && hasCycle(step.onFailure)) return true;
      }

      recursionStack.delete(stepId);
      return false;
    };

    return steps.some(step => hasCycle(step.id));
  }

  private containsSensitiveData(parameters: any): boolean {
    const sensitiveKeywords = ['password', 'token', 'key', 'secret', 'credential', 'ssn', 'credit'];
    const paramString = JSON.stringify(parameters).toLowerCase();
    return sensitiveKeywords.some(keyword => paramString.includes(keyword));
  }

  private isTrustedIntegration(integration: string): boolean {
    const trustedIntegrations = ['gmail', 'slack', 'notion', 'microsoft', 'google'];
    return trustedIntegrations.includes(integration.toLowerCase());
  }

  private identifyParallelExecutionOpportunities(steps: any[]): string[] {
    // Simple heuristic: steps that don't depend on each other can be parallel
    const opportunities: string[] = [];
    
    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];
      
      if (!nextStep.onSuccess || nextStep.onSuccess !== currentStep.id) {
        opportunities.push(`${currentStep.id} and ${nextStep.id}`);
      }
    }
    
    return opportunities;
  }

  private checkPolicyCompliance(workflow: WorkflowDesign, policy: Policy): string[] {
    const violations: string[] = [];
    
    // Simple policy checking - in reality this would be more sophisticated
    for (const rule of policy.rules) {
      if (rule.condition.includes('external_api') && 
          workflow.steps.some(s => !this.isTrustedIntegration(s.integration))) {
        violations.push(rule.message);
      }
    }
    
    return violations;
  }

  private estimateFixTime(issues: ValidationIssue[]): number {
    return issues.reduce((total, issue) => {
      const timeMap = { error: 30, warning: 15, info: 5 };
      return total + timeMap[issue.severity];
    }, 0);
  }

  private calculateRiskLevel(errorCount: number, warningCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (errorCount > 0) return 'critical';
    if (warningCount > 3) return 'high';
    if (warningCount > 1) return 'medium';
    return 'low';
  }
}