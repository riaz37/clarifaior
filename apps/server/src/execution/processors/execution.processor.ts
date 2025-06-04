import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import {
  FlowDefinition,
  FlowNode,
  FlowEdge,
  ExecutionJobData,
} from '@repo/types';
import { ExecutionService } from '@execution/execution.service';
import { NodeExecutorService } from '@execution/services/node-executor.service';
import { LoggerService } from '@common/services/logger.service';

@Processor('agent-execution')
@Injectable()
export class ExecutionProcessor {
  constructor(
    private executionService: ExecutionService,
    private nodeExecutorService: NodeExecutorService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('ExecutionProcessor');
  }

  @Process('execute-agent')
  async executeAgent(job: Job<ExecutionJobData>) {
    const {
      executionId,
      agentId,
      flowDefinition,
      triggerData,
      context,
      testMode,
    } = job.data;

    this.logger.log(`Processing execution: ${executionId}`, {
      executionId,
      agentId,
      testMode,
    });

    try {
      // Update status to running
      await this.executionService.updateExecutionStatus(executionId, 'running');

      // Execute the flow
      const result = await this.executeFlow(
        executionId,
        flowDefinition,
        triggerData,
        context,
        testMode,
      );

      // Update status to completed
      await this.executionService.updateExecutionStatus(
        executionId,
        'completed',
      );

      this.logger.log(`Execution completed: ${executionId}`, {
        executionId,
        agentId,
        stepsExecuted: result.stepsExecuted,
      });

      return result;
    } catch (error) {
      this.logger.error(`Execution failed: ${executionId}`, error.stack, {
        executionId,
        agentId,
        error: error.message,
      });

      // Update status to failed
      await this.executionService.updateExecutionStatus(
        executionId,
        'failed',
        error.message,
      );

      throw error;
    }
  }

  private async executeFlow(
    executionId: string,
    flowDefinition: FlowDefinition,
    triggerData?: Record<string, any>,
    context?: Record<string, any>,
    testMode?: boolean,
  ): Promise<any> {
    const { nodes, edges } = flowDefinition;

    // Build execution graph
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const edgeMap = this.buildEdgeMap(edges);

    // Find trigger nodes (starting points)
    const triggerNodes = nodes.filter((node) =>
      node.type.startsWith('trigger_'),
    );

    if (triggerNodes.length === 0) {
      throw new Error('No trigger nodes found in flow');
    }

    // Initialize execution context
    const executionContext = {
      ...context,
      trigger: triggerData,
      testMode,
      variables: new Map<string, any>(),
    };

    const stepNumber = 0;
    const executedNodes = new Set<string>();
    const results = new Map<string, any>();

    // Execute flow starting from trigger nodes
    for (const triggerNode of triggerNodes) {
      await this.executeNodeChain(
        executionId,
        triggerNode,
        nodeMap,
        edgeMap,
        executionContext,
        executedNodes,
        results,
        stepNumber,
      );
    }

    return {
      stepsExecuted: stepNumber,
      results: Object.fromEntries(results),
      executionContext,
    };
  }

  private async executeNodeChain(
    executionId: string,
    currentNode: FlowNode,
    nodeMap: Map<string, FlowNode>,
    edgeMap: Map<string, string[]>,
    executionContext: any,
    executedNodes: Set<string>,
    results: Map<string, any>,
    stepNumber: number,
  ): Promise<void> {
    // Skip if already executed (prevent cycles)
    if (executedNodes.has(currentNode.id)) {
      return;
    }

    stepNumber++;
    executedNodes.add(currentNode.id);

    this.logger.log(`Executing node: ${currentNode.id} (${currentNode.type})`, {
      executionId,
      nodeId: currentNode.id,
      stepNumber,
    });

    const startTime = Date.now();

    try {
      // Log step start
      await this.executionService.logExecutionStep(
        executionId,
        currentNode.id,
        stepNumber,
        'running',
        executionContext,
      );

      // Execute the node
      const nodeResult = await this.nodeExecutorService.executeNode(
        currentNode,
        executionContext,
        results,
      );

      const duration = Date.now() - startTime;

      // Store result
      results.set(currentNode.id, nodeResult.output);

      // Log step completion
      await this.executionService.logExecutionStep(
        executionId,
        currentNode.id,
        stepNumber,
        'completed',
        executionContext,
        nodeResult.output,
        undefined,
        duration,
        nodeResult.tokensUsed,
        nodeResult.cost,
      );

      // Handle conditional execution
      const nextNodes = this.getNextNodes(
        currentNode,
        nodeResult,
        edgeMap,
        nodeMap,
      );

      // Execute next nodes
      for (const nextNode of nextNodes) {
        await this.executeNodeChain(
          executionId,
          nextNode,
          nodeMap,
          edgeMap,
          executionContext,
          executedNodes,
          results,
          stepNumber,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log step failure
      await this.executionService.logExecutionStep(
        executionId,
        currentNode.id,
        stepNumber,
        'failed',
        executionContext,
        undefined,
        error.message,
        duration,
      );

      throw error;
    }
  }

  private buildEdgeMap(edges: FlowEdge[]): Map<string, string[]> {
    const edgeMap = new Map<string, string[]>();

    edges.forEach((edge) => {
      if (!edgeMap.has(edge.source)) {
        edgeMap.set(edge.source, []);
      }
      edgeMap.get(edge.source)!.push(edge.target);
    });

    return edgeMap;
  }

  private getNextNodes(
    currentNode: FlowNode,
    nodeResult: any,
    edgeMap: Map<string, string[]>,
    nodeMap: Map<string, FlowNode>,
  ): FlowNode[] {
    const nextNodeIds = edgeMap.get(currentNode.id) || [];

    // For condition nodes, filter based on result
    if (
      currentNode.type === 'condition' &&
      nodeResult.condition !== undefined
    ) {
      // TODO: Implement conditional logic based on sourceHandle/targetHandle
      // For now, return all next nodes
    }

    return nextNodeIds
      .map((nodeId) => nodeMap.get(nodeId))
      .filter((node): node is FlowNode => node !== undefined);
  }
}
