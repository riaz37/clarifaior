import { BaseMemory } from './base/base-memory';
import { MemoryData, MemorySearchResult } from './base/memory-interface';

export interface WorkflowStep {
  /**
   * Unique ID of the step
   */
  id: string;
  
  /**
   * Type of the step (e.g., 'task', 'decision', 'parallel', 'condition')
   */
  type: string;
  
  /**
   * Human-readable name of the step
   */
  name: string;
  
  /**
   * Current status of the step
   */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  
  /**
   * When the step started execution
   */
  startedAt?: Date;
  
  /**
   * When the step completed execution
   */
  completedAt?: Date;
  
  /**
   * Error information if the step failed
   */
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  
  /**
   * Input data for the step
   */
  input?: unknown;
  
  /**
   * Output data from the step
   */
  output?: unknown;
  
  /**
   * Step-specific metadata
   */
  metadata?: Record<string, unknown>;
  
  /**
   * Child steps (for composite steps like parallel or condition)
   */
  children?: WorkflowStep[];
  
  /**
   * ID of the next step to execute
   */
  nextStepId?: string;
}

export interface WorkflowContext {
  /**
   * Workflow input
   */
  input: Record<string, unknown>;
  
  /**
   * Workflow output (populated as steps complete)
   */
  output: Record<string, unknown>;
  
  /**
   * Shared context between steps
   */
  state: Record<string, unknown>;
  
  /**
   * Global variables accessible to all steps
   */
  variables: Record<string, unknown>;
  
  /**
   * Error information if the workflow failed
   */
  error?: {
    message: string;
    stack?: string;
    code?: string;
    stepId?: string;
  };
  
  /**
   * Metadata about the workflow execution
   */
  metadata: Record<string, unknown>;
}

export interface WorkflowData {
  /**
   * Unique ID of the workflow instance
   */
  id: string;
  
  /**
   * Workflow definition ID or name
   */
  workflowId: string;
  
  /**
   * Version of the workflow definition
   */
  version?: string;
  
  /**
   * Current status of the workflow
   */
  status: 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  
  /**
   * When the workflow was created
   */
  createdAt: Date;
  
  /**
   * When the workflow was last updated
   */
  updatedAt: Date;
  
  /**
   * When the workflow started execution
   */
  startedAt?: Date;
  
  /**
   * When the workflow completed execution
   */
  completedAt?: Date;
  
  /**
   * ID of the current step being executed
   */
  currentStepId?: string;
  
  /**
   * ID of the previous step that was executed
   */
  previousStepId?: string;
  
  /**
   * The root step of the workflow
   */
  rootStep: WorkflowStep;
  
  /**
   * Context data for the workflow
   */
  context: WorkflowContext;
  
  /**
   * Tags for categorization and filtering
   */
  tags?: string[];
  
  /**
   * User or system that initiated the workflow
   */
  initiator?: {
    type: 'user' | 'system' | 'api' | 'schedule';
    id: string;
    name?: string;
  };
  
  /**
   * Retry information if the workflow is being retried
   */
  retry?: {
    count: number;
    maxRetries: number;
    reason?: string;
  };
  
  /**
   * Timeouts for the workflow
   */
  timeouts?: {
    /**
     * Global timeout for the entire workflow
     */
    workflowTimeoutMs?: number;
    
    /**
     * Default step timeout if not specified in the step
     */
    defaultStepTimeoutMs?: number;
  };
  
  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Specialized memory for managing workflow states and execution context
 */
export class WorkflowMemory extends BaseMemory<WorkflowData> {
  /**
   * Start a new workflow execution
   */
  async startWorkflow(
    workflowId: string,
    input: Record<string, unknown>,
    options: {
      initiator?: { type: 'user' | 'system' | 'api' | 'schedule'; id: string; name?: string };
      tags?: string[];
      metadata?: Record<string, unknown>;
      version?: string;
      timeouts?: {
        workflowTimeoutMs?: number;
        defaultStepTimeoutMs?: number;
      };
    } = {}
  ): Promise<MemoryData<WorkflowData>> {
    const now = new Date();
    
    const workflowData: WorkflowData = {
      id: this.generateWorkflowId(),
      workflowId,
      version: options.version,
      status: 'created',
      createdAt: now,
      updatedAt: now,
      rootStep: {
        id: 'root',
        type: 'root',
        name: 'Root',
        status: 'pending'
      },
      context: {
        input,
        output: {},
        state: {},
        variables: {},
        metadata: {}
      },
      tags: options.tags,
      initiator: options.initiator,
      timeouts: options.timeouts,
      metadata: options.metadata
    };
    
    return this.add(workflowData);
  }
  
  /**
   * Update workflow status
   */
  async updateStatus(
    workflowId: string,
    status: WorkflowData['status']
  ): Promise<MemoryData<WorkflowData> | undefined> {
    const workflow = await this.get(workflowId);
    if (!workflow) return undefined;
    
    const updates: Partial<WorkflowData> = {
      status,
      updatedAt: new Date()
    };
    
    // Update timestamps based on status
    if (status === 'running' && !workflow.content.startedAt) {
      updates.startedAt = new Date();
    } else if ((status === 'completed' || status === 'failed' || status === 'cancelled') && !workflow.content.completedAt) {
      updates.completedAt = new Date();
    }
    
    return this.update(workflowId, updates);
  }
  
  /**
   * Update the current step in the workflow
   */
  async updateCurrentStep(
    workflowId: string,
    stepId: string,
    updates: Partial<WorkflowStep>
  ): Promise<MemoryData<WorkflowData> | undefined> {
    const workflow = await this.get(workflowId);
    if (!workflow) return undefined;
    
    // Update the step in the workflow
    const updatedWorkflow = this.updateStepInWorkflow(workflow.content, stepId, updates);
    
    // Update the workflow with the new step data
    const workflowUpdates: Partial<WorkflowData> = {
      ...updatedWorkflow,
      updatedAt: new Date(),
      previousStepId: workflow.content.currentStepId,
      currentStepId: stepId
    };
    
    return this.update(workflowId, workflowUpdates);
  }
  
  /**
   * Update workflow context
   */
  async updateContext(
    workflowId: string,
    updates: Partial<WorkflowContext>
  ): Promise<MemoryData<WorkflowData> | undefined> {
    const workflow = await this.get(workflowId);
    if (!workflow) return undefined;
    
    const updatedContext = {
      ...workflow.content.context,
      ...updates
    };
    
    // Create a new workflow data object with the updated context
    const updatedWorkflow: WorkflowData = {
      ...workflow.content,
      context: updatedContext,
      updatedAt: new Date()
    };
    
    return this.update(workflowId, updatedWorkflow);
  }
  
  /**
   * Find workflows by status
   */
  async findByStatus(
    status: WorkflowData['status'],
    options: { limit?: number } = {}
  ): Promise<MemoryData<WorkflowData>[]> {
    const allWorkflows = await this.list();
    const filtered = allWorkflows.filter(w => w.content.status === status);
    
    if (options.limit) {
      return filtered.slice(0, options.limit);
    }
    
    return filtered;
  }
  
  /**
   * Find workflows by initiator
   */
  async findByInitiator(
    initiatorId: string,
    options: { limit?: number } = {}
  ): Promise<MemoryData<WorkflowData>[]> {
    const allWorkflows = await this.list();
    const filtered = allWorkflows.filter(
      w => w.content.initiator?.id === initiatorId
    );
    
    if (options.limit) {
      return filtered.slice(0, options.limit);
    }
    
    return filtered;
  }
  
  /**
   * Implementation of abstract search method
   */
  async search(
    query: string | Record<string, unknown>,
    options: {
      limit?: number;
      minScore?: number;
      tags?: string[];
    } = {}
  ): Promise<MemorySearchResult<WorkflowData>[]> {
    const minScore = options.minScore ?? 0.3;
    const allWorkflows = await this.list({ tags: options.tags });
    
    if (typeof query === 'string') {
      const queryLower = query.toLowerCase();
      
      const results = allWorkflows
        .map(workflow => {
          let score = 0;
          
          // Check workflow ID and name
          if (workflow.content.id.toLowerCase().includes(queryLower)) {
            score = Math.max(score, 0.8);
          }
          
          if (workflow.content.workflowId.toLowerCase().includes(queryLower)) {
            score = Math.max(score, 0.7);
          }
          
          // Check status
          if (workflow.content.status.toLowerCase() === queryLower) {
            score = Math.max(score, 0.6);
          }
          
          // Check tags
          if (workflow.content.tags?.some(tag => 
            tag.toLowerCase().includes(queryLower)
          )) {
            score = Math.max(score, 0.5);
          }
          
          // Check metadata
          if (workflow.content.metadata) {
            const metadataStr = JSON.stringify(workflow.content.metadata).toLowerCase();
            if (metadataStr.includes(queryLower)) {
              score = Math.max(score, 0.4);
            }
          }
          
          return { ...workflow, score };
        })
        .filter(result => result.score >= minScore)
        .sort((a, b) => b.score - a.score);
      
      return options.limit ? results.slice(0, options.limit) : results;
    }
    
    // Object query (search in workflow properties)
    const results = allWorkflows
      .map(workflow => {
        let matchScore = 0;
        let matchedFields = 0;
        
        // Calculate how many query fields match
        for (const [key, value] of Object.entries(query)) {
          // Handle nested properties with dot notation
          const keys = key.split('.');
          let current: any = workflow.content;
          
          try {
            for (const k of keys) {
              current = current?.[k];
            }
            
            if (JSON.stringify(current) === JSON.stringify(value)) {
              matchedFields++;
            }
          } catch (e) {
            // Property doesn't exist or can't be accessed
          }
        }
        
        if (matchedFields > 0) {
          matchScore = matchedFields / Object.keys(query).length;
        }
        
        return matchScore >= minScore 
          ? { ...workflow, score: matchScore }
          : null;
      })
      .filter((result): result is MemorySearchResult<WorkflowData> => result !== null)
      .sort((a, b) => b.score - a.score);
    
    return options.limit ? results.slice(0, options.limit) : results;
  }
  
  /**
   * Generate a unique workflow ID
   */
  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Helper to update a step in the workflow tree
   */
  private updateStepInWorkflow(
    workflow: WorkflowData,
    stepId: string,
    updates: Partial<WorkflowStep>
  ): WorkflowData {
    const updateStep = (step: WorkflowStep): WorkflowStep => {
      if (step.id === stepId) {
        // Apply updates to the step
        return {
          ...step,
          ...updates,
          // Preserve children if not being updated
          children: updates.children !== undefined ? updates.children : step.children
        };
      }
      
      // Recursively update children
      if (step.children) {
        return {
          ...step,
          children: step.children.map(updateStep)
        };
      }
      
      return step;
    };
    
    // Create a deep copy of the workflow with the updated step
    return {
      ...workflow,
      rootStep: updateStep(workflow.rootStep)
    };
  }
}

export default WorkflowMemory;