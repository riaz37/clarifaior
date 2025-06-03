import { Injectable } from '@nestjs/common';
import { FlowNode } from '@repo/types';
import { LoggerService } from '../../common/services/logger.service';
import { IntegrationService } from '../../integrations/integration.service';

export interface NodeExecutionResult {
  output: any;
  tokensUsed?: number;
  cost?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class NodeExecutorService {
  constructor(
    private logger: LoggerService,
    private integrationService: IntegrationService,
  ) {
    this.logger.setContext('NodeExecutorService');
  }

  async executeNode(
    node: FlowNode,
    executionContext: any,
    previousResults: Map<string, any>,
  ): Promise<NodeExecutionResult> {
    this.logger.log(`Executing node: ${node.id} (${node.type})`);

    // Resolve variables in node data
    const resolvedData = this.resolveVariables(
      node.data,
      executionContext,
      previousResults,
    );

    switch (node.type) {
      case 'trigger_gmail':
        return this.executeTriggerGmail(resolvedData, executionContext);

      case 'trigger_slack':
        return this.executeTriggerSlack(resolvedData, executionContext);

      case 'trigger_webhook':
        return this.executeTriggerWebhook(resolvedData, executionContext);

      case 'prompt_llm':
        return this.executePromptLLM(resolvedData, executionContext);

      case 'prompt_memory':
        return this.executePromptMemory(resolvedData, executionContext);

      case 'action_slack':
        return this.executeActionSlack(resolvedData, executionContext);

      case 'action_notion':
        return this.executeActionNotion(resolvedData, executionContext);

      case 'action_email':
        return this.executeActionEmail(resolvedData, executionContext);

      case 'action_webhook':
        return this.executeActionWebhook(resolvedData, executionContext);

      case 'condition':
        return this.executeCondition(resolvedData, executionContext);

      case 'transformer':
        return this.executeTransformer(resolvedData, executionContext);

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  private async executeTriggerGmail(
    data: any,
    context: any,
  ): Promise<NodeExecutionResult> {
    // For triggers, we typically just pass through the trigger data
    return {
      output: context.trigger || {},
    };
  }

  private async executeTriggerSlack(
    data: any,
    context: any,
  ): Promise<NodeExecutionResult> {
    return {
      output: context.trigger || {},
    };
  }

  private async executeTriggerWebhook(
    data: any,
    context: any,
  ): Promise<NodeExecutionResult> {
    return {
      output: context.trigger || {},
    };
  }

  private async executePromptLLM(
    data: any,
    context: any,
  ): Promise<NodeExecutionResult> {
    const {
      prompt,
      model = 'gpt-4',
      temperature = 0.7,
      maxTokens = 1000,
    } = data;

    if (!prompt) {
      throw new Error('LLM prompt is required');
    }

    try {
      // Use integration service to call LLM
      const result = await this.integrationService.callLLM({
        prompt,
        model,
        temperature,
        maxTokens,
      });

      return {
        output: {
          response: result.response,
          model: result.model,
        },
        tokensUsed: result.tokensUsed,
        cost: result.cost,
      };
    } catch (error) {
      throw new Error(`LLM execution failed: ${error.message}`);
    }
  }

  private async executePromptMemory(
    data: any,
    context: any,
  ): Promise<NodeExecutionResult> {
    const { query, topK = 5, threshold = 0.7 } = data;

    if (!query) {
      throw new Error('Memory search query is required');
    }

    try {
      const results = await this.integrationService.searchMemory({
        query,
        topK,
        threshold,
      });

      return {
        output: {
          results,
          query,
          count: results.length,
        },
      };
    } catch (error) {
      throw new Error(`Memory search failed: ${error.message}`);
    }
  }

  private async executeActionSlack(
    data: any,
    context: any,
  ): Promise<NodeExecutionResult> {
    const { channel, message, threadReply = false } = data;

    if (!channel || !message) {
      throw new Error('Slack channel and message are required');
    }

    try {
      const result = await this.integrationService.sendSlackMessage({
        channel,
        message,
        threadReply,
      });

      return {
        output: {
          messageId: result.messageId,
          channel,
          timestamp: result.timestamp ? parseFloat(result.timestamp) : 0, // Convert Slack timestamp to number
        },
      };
    } catch (error) {
      throw new Error(`Slack message failed: ${error.message}`);
    }
  }

  private async executeActionNotion(
    data: any,
    context: any,
  ): Promise<NodeExecutionResult> {
    const { database, title, properties = {} } = data;

    if (!database) {
      throw new Error('Notion database ID is required');
    }

    try {
      const result = await this.integrationService.createNotionPage({
        database,
        title,
        properties,
      });

      return {
        output: {
          pageId: result.pageId,
          url: result.url,
          title,
        },
      };
    } catch (error) {
      throw new Error(`Notion page creation failed: ${error.message}`);
    }
  }

  private async executeActionEmail(
    data: any,
    context: any,
  ): Promise<NodeExecutionResult> {
    const { to, subject, body, html = false } = data;

    if (!to || !subject || !body) {
      throw new Error('Email recipient, subject, and body are required');
    }

    try {
      const result = await this.integrationService.sendEmail({
        to,
        subject,
        body,
        html,
      });

      return {
        output: {
          messageId: result.messageId,
          to,
          subject,
        },
      };
    } catch (error) {
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  private async executeActionWebhook(
    data: any,
    context: any,
  ): Promise<NodeExecutionResult> {
    const { url, method = 'POST', headers = {}, body } = data;

    if (!url) {
      throw new Error('Webhook URL is required');
    }

    try {
      const result = await this.integrationService.callWebhook({
        url,
        method,
        headers,
        body,
      });

      return {
        output: {
          status: result.status,
          response: result.response,
          url,
        },
      };
    } catch (error) {
      throw new Error(`Webhook call failed: ${error.message}`);
    }
  }

  private async executeCondition(
    data: any,
    context: any,
  ): Promise<NodeExecutionResult> {
    const { condition, operator, value } = data;

    if (condition === undefined) {
      throw new Error('Condition value is required');
    }

    let result = false;

    switch (operator) {
      case 'equals':
        result = condition == value;
        break;
      case 'not_equals':
        result = condition != value;
        break;
      case 'contains':
        result = String(condition).includes(String(value));
        break;
      case 'greater_than':
        result = Number(condition) > Number(value);
        break;
      case 'less_than':
        result = Number(condition) < Number(value);
        break;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }

    return {
      output: {
        condition: result,
        value: condition,
        operator,
        expected: value,
      },
    };
  }

  private async executeTransformer(
    data: any,
    context: any,
  ): Promise<NodeExecutionResult> {
    const { transformation, script } = data;

    if (!script) {
      throw new Error('Transformation script is required');
    }

    try {
      let result;

      switch (transformation) {
        case 'javascript':
          // Simple JavaScript evaluation (be careful in production!)
          const func = new Function('input', 'context', script);
          result = func(context, context);
          break;

        case 'json':
          result = JSON.parse(script);
          break;

        case 'text':
          result = script;
          break;

        default:
          throw new Error(`Unknown transformation type: ${transformation}`);
      }

      return {
        output: result,
      };
    } catch (error) {
      throw new Error(`Transformation failed: ${error.message}`);
    }
  }

  private resolveVariables(
    data: any,
    executionContext: any,
    previousResults: Map<string, any>,
  ): any {
    if (typeof data === 'string') {
      return this.interpolateString(data, executionContext, previousResults);
    }

    if (Array.isArray(data)) {
      return data.map((item) =>
        this.resolveVariables(item, executionContext, previousResults),
      );
    }

    if (data && typeof data === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(data)) {
        resolved[key] = this.resolveVariables(
          value,
          executionContext,
          previousResults,
        );
      }
      return resolved;
    }

    return data;
  }

  private interpolateString(
    template: string,
    executionContext: any,
    previousResults: Map<string, any>,
  ): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      try {
        const trimmed = expression.trim();

        // Handle context variables
        if (trimmed.startsWith('context.')) {
          const path = trimmed.substring(8);
          return this.getNestedValue(executionContext, path) || match;
        }

        // Handle trigger data
        if (trimmed.startsWith('trigger.')) {
          const path = trimmed.substring(8);
          return this.getNestedValue(executionContext.trigger, path) || match;
        }

        // Handle previous node results
        if (trimmed.includes('.')) {
          const [nodeId, ...pathParts] = trimmed.split('.');
          const nodeResult = previousResults.get(nodeId);
          if (nodeResult) {
            return (
              this.getNestedValue(nodeResult, pathParts.join('.')) || match
            );
          }
        }

        return match;
      } catch (error) {
        this.logger.warn(`Variable interpolation failed: ${expression}`, {
          error: error.message,
        });
        return match;
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
