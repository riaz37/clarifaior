import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { eq, and, desc } from 'drizzle-orm';
import { agents, executions, executionLogs } from 'database/src/db/schema';
import { Execution, ExecutionStatus, PaginationQuery } from '@repo/types';
import { DatabaseService } from '../common/services/database.service';
import { LoggerService } from '../common/services/logger.service';
import { StartExecutionDto } from './dto/start-execution.dto';

export interface ExecutionJobData {
  executionId: number;
  agentId: number;
  flowDefinition: any;
  triggerData?: Record<string, any>;
  context?: Record<string, any>;
  testMode?: boolean;
}

@Injectable()
export class ExecutionService {
  constructor(
    @InjectQueue('agent-execution') private executionQueue: Queue,
    private databaseService: DatabaseService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('ExecutionService');
  }

  async startExecution(
    startExecutionDto: StartExecutionDto,
    userId: number,
  ): Promise<Execution> {
    const {
      agentId,
      triggerType,
      triggerData,
      context,
      testMode,
      priority,
      metadata,
    } = startExecutionDto;

    this.logger.log(`Starting execution for agent: ${agentId}`, {
      userId,
      agentId,
      triggerType,
      testMode,
    });

    // Get agent and verify access
    const [agent] = await this.databaseService.db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (!agent.flowDefinition) {
      throw new BadRequestException('Agent has no flow definition');
    }

    if (agent.status !== 'active' && !testMode) {
      throw new BadRequestException('Agent is not active');
    }

    // Create execution record
    const [execution] = await this.databaseService.db
      .insert(executions)
      .values({
        agentId,
        triggerType: triggerType || 'manual',
        triggerData,
        status: 'pending',
        metadata: {
          ...metadata,
          userId,
          testMode,
        },
      })
      .returning();

    // Add job to queue
    const jobData: ExecutionJobData = {
      executionId: execution.id,
      agentId,
      flowDefinition: agent.flowDefinition,
      triggerData,
      context,
      testMode,
    };

    await this.executionQueue.add('execute-agent', jobData, {
      priority: priority || 0,
      attempts: testMode ? 1 : 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    this.logger.log(`Execution queued: ${execution.id}`, {
      executionId: execution.id,
      agentId,
      userId,
    });

    return this.mapToExecutionResponse(execution);
  }

  async getExecution(executionId: number): Promise<Execution> {
    const [execution] = await this.databaseService.db
      .select()
      .from(executions)
      .where(eq(executions.id, executionId))
      .limit(1);

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    return this.mapToExecutionResponse(execution);
  }

  async getExecutions(
    agentId: number,
    pagination: PaginationQuery,
  ): Promise<any> {
    this.logger.log(`Fetching executions for agent: ${agentId}`);

    const query = this.databaseService.db
      .select()
      .from(executions)
      .where(eq(executions.agentId, agentId))
      .orderBy(desc(executions.createdAt));

    return this.databaseService.paginate(query, pagination);
  }

  async getExecutionLogs(executionId: number): Promise<any[]> {
    const logs = await this.databaseService.db
      .select()
      .from(executionLogs)
      .where(eq(executionLogs.executionId, executionId))
      .orderBy(executionLogs.stepNumber);

    return logs.map((log) => ({
      id: log.id,
      nodeId: log.nodeId,
      stepNumber: log.stepNumber,
      status: log.status,
      input: log.input,
      output: log.output,
      error: log.error,
      duration: log.duration,
      tokensUsed: log.tokensUsed,
      cost: log.cost ? parseFloat(log.cost) : null,
      startedAt: log.startedAt?.toISOString(),
      completedAt: log.completedAt?.toISOString(),
    }));
  }

  async cancelExecution(executionId: number, userId: number): Promise<void> {
    this.logger.log(`Cancelling execution: ${executionId}`, {
      executionId,
      userId,
    });

    // Update execution status
    await this.databaseService.db
      .update(executions)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
      })
      .where(eq(executions.id, executionId));

    // Try to remove job from queue if still pending
    const jobs = await this.executionQueue.getJobs(['waiting', 'active']);
    const job = jobs.find((j) => j.data.executionId === executionId);

    if (job) {
      await job.remove();
      this.logger.log(`Removed job from queue: ${executionId}`);
    }
  }

  async updateExecutionStatus(
    executionId: number,
    status: ExecutionStatus,
    error?: string,
  ): Promise<void> {
    const updateData: any = { status };

    if (status === 'running' && !error) {
      updateData.startedAt = new Date();
    }

    if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled'
    ) {
      updateData.completedAt = new Date();
    }

    if (error) {
      updateData.error = error;
    }

    await this.databaseService.db
      .update(executions)
      .set(updateData)
      .where(eq(executions.id, executionId));

    this.logger.log(`Execution status updated: ${executionId} -> ${status}`, {
      executionId,
      status,
      hasError: !!error,
    });
  }

  async logExecutionStep(
    executionId: number,
    nodeId: string,
    stepNumber: number,
    status: ExecutionStatus,
    input?: any,
    output?: any,
    error?: string,
    duration?: number,
    tokensUsed?: number,
    cost?: number,
  ): Promise<void> {
    await this.databaseService.db.insert(executionLogs).values({
      executionId,
      nodeId,
      stepNumber,
      status,
      input,
      output,
      error,
      duration,
      tokensUsed,
      cost: cost ? cost.toString() : null,
      startedAt: new Date(),
      completedAt: status !== 'running' ? new Date() : null,
    });

    this.logger.logExecution(
      status === 'failed' ? 'error' : 'info',
      `Step ${stepNumber} (${nodeId}): ${status}`,
      executionId,
      nodeId,
      { duration, tokensUsed, cost },
    );
  }

  async getQueueStats(): Promise<any> {
    const waiting = await this.executionQueue.getWaiting();
    const active = await this.executionQueue.getActive();
    const completed = await this.executionQueue.getCompleted();
    const failed = await this.executionQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    };
  }

  private mapToExecutionResponse(execution: any): Execution {
    return {
      id: execution.id,
      agentId: execution.agentId,
      triggerType: execution.triggerType,
      triggerData: execution.triggerData,
      status: execution.status,
      startedAt: execution.startedAt?.toISOString(),
      completedAt: execution.completedAt?.toISOString(),
      error: execution.error,
      metadata: execution.metadata,
      createdAt: execution.createdAt?.toISOString(),
    };
  }
}
