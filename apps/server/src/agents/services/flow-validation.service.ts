import { Injectable } from '@nestjs/common';
import { FlowDefinition, FlowNode, FlowEdge, NodeType } from '@repo/types';
import { LoggerService } from '@common/services/logger.service';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class FlowValidationService {
  constructor(private logger: LoggerService) {
    this.logger.setContext('FlowValidationService');
  }

  validateFlow(flowDefinition: FlowDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!flowDefinition) {
      errors.push('Flow definition is required');
      return { valid: false, errors, warnings };
    }

    const { nodes, edges } = flowDefinition;

    // Validate basic structure
    if (!Array.isArray(nodes)) {
      errors.push('Nodes must be an array');
    }

    if (!Array.isArray(edges)) {
      errors.push('Edges must be an array');
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Validate nodes
    this.validateNodes(nodes, errors, warnings);

    // Validate edges
    this.validateEdges(edges, nodes, errors, warnings);

    // Validate flow logic
    this.validateFlowLogic(nodes, edges, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateNodes(
    nodes: FlowNode[],
    errors: string[],
    warnings: string[],
  ): void {
    const nodeIds = new Set<string>();
    const triggerNodes = nodes.filter((node) =>
      node.type.startsWith('trigger_'),
    );

    // Check for duplicate node IDs
    nodes.forEach((node, index) => {
      if (!node.id) {
        errors.push(`Node at index ${index} is missing an ID`);
        return;
      }

      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);

      // Validate node structure
      this.validateNode(node, index, errors, warnings);
    });

    // Flow must have at least one trigger
    if (triggerNodes.length === 0) {
      errors.push('Flow must have at least one trigger node');
    }

    // Warn about multiple triggers
    if (triggerNodes.length > 1) {
      warnings.push(
        'Multiple trigger nodes detected. Only one will be active at a time.',
      );
    }
  }

  private validateNode(
    node: FlowNode,
    index: number,
    errors: string[],
    warnings: string[],
  ): void {
    // Validate required fields
    if (!node.type) {
      errors.push(`Node at index ${index} is missing a type`);
    }

    if (!node.label) {
      warnings.push(`Node ${node.id} is missing a label`);
    }

    if (
      !node.position ||
      typeof node.position.x !== 'number' ||
      typeof node.position.y !== 'number'
    ) {
      errors.push(`Node ${node.id} has invalid position coordinates`);
    }

    // Validate node-specific configuration
    this.validateNodeConfiguration(node, errors, warnings);
  }

  private validateNodeConfiguration(
    node: FlowNode,
    errors: string[],
    warnings: string[],
  ): void {
    const { type, data } = node;

    switch (type) {
      case 'trigger_gmail':
        if (!data?.filter && !data?.labels) {
          warnings.push(
            `Gmail trigger ${node.id} should have email filters or labels configured`,
          );
        }
        break;

      case 'trigger_slack':
        if (!data?.channel && !data?.eventType) {
          warnings.push(
            `Slack trigger ${node.id} should have channel or event type configured`,
          );
        }
        break;

      case 'trigger_webhook':
        if (!data?.endpoint) {
          errors.push(
            `Webhook trigger ${node.id} must have an endpoint configured`,
          );
        }
        break;

      case 'prompt_llm':
        if (!data?.prompt) {
          errors.push(
            `LLM prompt node ${node.id} must have a prompt configured`,
          );
        }
        if (!data?.model) {
          warnings.push(`LLM prompt node ${node.id} should specify a model`);
        }
        break;

      case 'action_slack':
        if (!data?.channel && !data?.user) {
          errors.push(
            `Slack action ${node.id} must have a channel or user specified`,
          );
        }
        if (!data?.message) {
          errors.push(`Slack action ${node.id} must have a message configured`);
        }
        break;

      case 'action_notion':
        if (!data?.database && !data?.page) {
          errors.push(
            `Notion action ${node.id} must specify a database or page`,
          );
        }
        break;

      case 'action_email':
        if (!data?.to) {
          errors.push(
            `Email action ${node.id} must have recipient(s) specified`,
          );
        }
        if (!data?.subject) {
          warnings.push(`Email action ${node.id} should have a subject`);
        }
        break;

      case 'condition':
        if (!data?.condition) {
          errors.push(
            `Condition node ${node.id} must have a condition configured`,
          );
        }
        break;
    }
  }

  private validateEdges(
    edges: FlowEdge[],
    nodes: FlowNode[],
    errors: string[],
    warnings: string[],
  ): void {
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edgeIds = new Set<string>();

    edges.forEach((edge, index) => {
      if (!edge.id) {
        errors.push(`Edge at index ${index} is missing an ID`);
        return;
      }

      if (edgeIds.has(edge.id)) {
        errors.push(`Duplicate edge ID: ${edge.id}`);
      }
      edgeIds.add(edge.id);

      // Validate source and target nodes exist
      if (!nodeIds.has(edge.source)) {
        errors.push(
          `Edge ${edge.id} references non-existent source node: ${edge.source}`,
        );
      }

      if (!nodeIds.has(edge.target)) {
        errors.push(
          `Edge ${edge.id} references non-existent target node: ${edge.target}`,
        );
      }
    });
  }

  private validateFlowLogic(
    nodes: FlowNode[],
    edges: FlowEdge[],
    errors: string[],
    warnings: string[],
  ): void {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const incomingEdges = new Map<string, FlowEdge[]>();
    const outgoingEdges = new Map<string, FlowEdge[]>();

    // Build edge maps
    edges.forEach((edge) => {
      if (!incomingEdges.has(edge.target)) {
        incomingEdges.set(edge.target, []);
      }
      incomingEdges.get(edge.target)!.push(edge);

      if (!outgoingEdges.has(edge.source)) {
        outgoingEdges.set(edge.source, []);
      }
      outgoingEdges.get(edge.source)!.push(edge);
    });

    // Check for orphaned nodes
    nodes.forEach((node) => {
      const hasIncoming = incomingEdges.has(node.id);
      const hasOutgoing = outgoingEdges.has(node.id);
      const isTrigger = node.type.startsWith('trigger_');

      if (!hasIncoming && !isTrigger) {
        warnings.push(
          `Node ${node.id} has no incoming connections and is not a trigger`,
        );
      }

      if (!hasOutgoing && !node.type.startsWith('action_')) {
        warnings.push(
          `Node ${node.id} has no outgoing connections and is not an action`,
        );
      }
    });

    // Check for cycles (simplified detection)
    this.detectCycles(nodes, edges, warnings);
  }

  private detectCycles(
    nodes: FlowNode[],
    edges: FlowEdge[],
    warnings: string[],
  ): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const adjacencyList = new Map<string, string[]>();

    // Build adjacency list
    nodes.forEach((node) => adjacencyList.set(node.id, []));
    edges.forEach((edge) => {
      if (adjacencyList.has(edge.source)) {
        adjacencyList.get(edge.source)!.push(edge.target);
      }
    });

    // DFS to detect cycles
    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id) && hasCycle(node.id)) {
        warnings.push('Flow contains cycles which may cause infinite loops');
        break;
      }
    }
  }
}
