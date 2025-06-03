import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as cron from 'node-cron';
import * as moment from 'moment-timezone';
import { eq, and, lte } from 'drizzle-orm';
import { schedules, agents } from 'database/src/db/schema';
import { DatabaseService } from '../common/services/database.service';
import { LoggerService } from '../common/services/logger.service';
import { ExecutionService } from '../execution/execution.service';

export interface CreateScheduleDto {
  agentId: number;
  name: string;
  cronExpression: string;
  timezone?: string;
  config?: Record<string, any>;
}

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private scheduledTasks = new Map<number, cron.ScheduledTask>();

  constructor(
    private databaseService: DatabaseService,
    private logger: LoggerService,
    private executionService: ExecutionService,
  ) {
    this.logger.setContext('SchedulerService');
  }

  async onModuleInit() {
    this.logger.log('Initializing scheduler service');
    await this.loadActiveSchedules();
  }

  async onModuleDestroy() {
    this.logger.log('Destroying scheduler service');
    this.stopAllSchedules();
  }

  async createSchedule(
    createScheduleDto: CreateScheduleDto,
    userId: number,
  ): Promise<any> {
    const {
      agentId,
      name,
      cronExpression,
      timezone = 'UTC',
      config,
    } = createScheduleDto;

    this.logger.log(`Creating schedule for agent: ${agentId}`, {
      userId,
      agentId,
      name,
      cronExpression,
      timezone,
    });

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new BadRequestException('Invalid cron expression');
    }

    // Validate timezone
    if (!moment.tz.zone(timezone)) {
      throw new BadRequestException('Invalid timezone');
    }

    // Verify agent exists
    const [agent] = await this.databaseService.db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Calculate next run time
    const nextRun = this.calculateNextRun(cronExpression, timezone);

    const [schedule] = await this.databaseService.db
      .insert(schedules)
      .values({
        agentId,
        createdBy: userId,
        name,
        cronExpression,
        timezone,
        nextRun,
        config,
      })
      .returning();

    // Start the schedule
    await this.startSchedule(schedule);

    this.logger.log(`Schedule created: ${schedule.id}`, {
      scheduleId: schedule.id,
      agentId,
      nextRun: nextRun.toISOString(),
    });

    return {
      id: schedule.id,
      name: schedule.name,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      isActive: schedule.isActive,
      nextRun: schedule.nextRun?.toISOString(),
      runCount: schedule.runCount,
      agentId: schedule.agentId,
      createdAt: schedule.createdAt?.toISOString(),
    };
  }

  async getSchedules(agentId: number): Promise<any[]> {
    const scheduleList = await this.databaseService.db
      .select()
      .from(schedules)
      .where(eq(schedules.agentId, agentId));

    return scheduleList.map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      isActive: schedule.isActive,
      lastRun: schedule.lastRun?.toISOString(),
      nextRun: schedule.nextRun?.toISOString(),
      runCount: schedule.runCount,
      createdAt: schedule.createdAt?.toISOString(),
    }));
  }

  async updateSchedule(
    scheduleId: number,
    updates: Partial<CreateScheduleDto>,
    userId: number,
  ): Promise<any> {
    this.logger.log(`Updating schedule: ${scheduleId}`, { userId, scheduleId });

    // Validate cron expression if provided
    if (updates.cronExpression && !cron.validate(updates.cronExpression)) {
      throw new BadRequestException('Invalid cron expression');
    }

    // Validate timezone if provided
    if (updates.timezone && !moment.tz.zone(updates.timezone)) {
      throw new BadRequestException('Invalid timezone');
    }

    // Stop existing schedule
    this.stopSchedule(scheduleId);

    // Calculate new next run time if cron or timezone changed
    let nextRun: Date | undefined;
    if (updates.cronExpression || updates.timezone) {
      const [currentSchedule] = await this.databaseService.db
        .select()
        .from(schedules)
        .where(eq(schedules.id, scheduleId))
        .limit(1);

      if (currentSchedule) {
        nextRun = this.calculateNextRun(
          updates.cronExpression || currentSchedule.cronExpression,
          updates.timezone || currentSchedule.timezone,
        );
      }
    }

    const [updatedSchedule] = await this.databaseService.db
      .update(schedules)
      .set({
        ...updates,
        ...(nextRun && { nextRun }),
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, scheduleId))
      .returning();

    if (!updatedSchedule) {
      throw new NotFoundException('Schedule not found');
    }

    // Restart schedule if active
    if (updatedSchedule.isActive) {
      await this.startSchedule(updatedSchedule);
    }

    return {
      id: updatedSchedule.id,
      name: updatedSchedule.name,
      cronExpression: updatedSchedule.cronExpression,
      timezone: updatedSchedule.timezone,
      isActive: updatedSchedule.isActive,
      nextRun: updatedSchedule.nextRun?.toISOString(),
      runCount: updatedSchedule.runCount,
      updatedAt: updatedSchedule.updatedAt?.toISOString(),
    };
  }

  async deleteSchedule(scheduleId: number, userId: number): Promise<void> {
    this.logger.log(`Deleting schedule: ${scheduleId}`, { userId, scheduleId });

    // Stop the schedule
    this.stopSchedule(scheduleId);

    const result = await this.databaseService.db
      .delete(schedules)
      .where(and(eq(schedules.id, scheduleId), eq(schedules.createdBy, userId)))
      .returning();

    if (result.length === 0) {
      throw new NotFoundException('Schedule not found or access denied');
    }
  }

  async toggleSchedule(scheduleId: number, isActive: boolean): Promise<void> {
    this.logger.log(`Toggling schedule: ${scheduleId} to ${isActive}`, {
      scheduleId,
      isActive,
    });

    const [schedule] = await this.databaseService.db
      .update(schedules)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(schedules.id, scheduleId))
      .returning();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (isActive) {
      await this.startSchedule(schedule);
    } else {
      this.stopSchedule(scheduleId);
    }
  }

  private async loadActiveSchedules(): Promise<void> {
    const activeSchedules = await this.databaseService.db
      .select()
      .from(schedules)
      .where(eq(schedules.isActive, true));

    this.logger.log(`Loading ${activeSchedules.length} active schedules`);

    for (const schedule of activeSchedules) {
      await this.startSchedule(schedule);
    }
  }

  private async startSchedule(schedule: any): Promise<void> {
    try {
      const task = cron.schedule(
        schedule.cronExpression,
        async () => {
          await this.executeScheduledAgent(schedule);
        },
        {
          scheduled: true,
          timezone: schedule.timezone,
        },
      );

      this.scheduledTasks.set(schedule.id, task);

      this.logger.log(`Schedule started: ${schedule.id}`, {
        scheduleId: schedule.id,
        cronExpression: schedule.cronExpression,
        timezone: schedule.timezone,
      });
    } catch (error) {
      this.logger.error(
        `Failed to start schedule: ${schedule.id}`,
        error.stack,
      );
    }
  }

  private stopSchedule(scheduleId: number): void {
    const task = this.scheduledTasks.get(scheduleId);
    if (task) {
      task.stop();
      task.destroy();
      this.scheduledTasks.delete(scheduleId);
      this.logger.log(`Schedule stopped: ${scheduleId}`);
    }
  }

  private stopAllSchedules(): void {
    for (const [scheduleId, task] of this.scheduledTasks) {
      task.stop();
      task.destroy();
    }
    this.scheduledTasks.clear();
    this.logger.log('All schedules stopped');
  }

  private async executeScheduledAgent(schedule: any): Promise<void> {
    try {
      this.logger.log(`Executing scheduled agent: ${schedule.agentId}`, {
        scheduleId: schedule.id,
        agentId: schedule.agentId,
      });

      // Start agent execution
      await this.executionService.startExecution(
        {
          agentId: schedule.agentId,
          triggerType: 'schedule',
          triggerData: {
            schedule: {
              id: schedule.id,
              name: schedule.name,
              cronExpression: schedule.cronExpression,
              timezone: schedule.timezone,
            },
          },
          context: {
            scheduleId: schedule.id,
            scheduledAt: new Date().toISOString(),
          },
        },
        schedule.createdBy,
      );

      // Update schedule stats
      const nextRun = this.calculateNextRun(
        schedule.cronExpression,
        schedule.timezone,
      );

      await this.databaseService.db
        .update(schedules)
        .set({
          lastRun: new Date(),
          nextRun,
          runCount: schedule.runCount + 1,
        })
        .where(eq(schedules.id, schedule.id));
    } catch (error) {
      this.logger.error(
        `Scheduled execution failed: ${schedule.id}`,
        error.stack,
        {
          scheduleId: schedule.id,
          agentId: schedule.agentId,
        },
      );
    }
  }

  private calculateNextRun(cronExpression: string, timezone: string): Date {
    const now = moment.tz(timezone);
    const cronJob = cron.schedule(cronExpression, () => {}, {
      scheduled: false,
      timezone,
    });

    // Simple next run calculation - in production, use a proper cron parser
    const nextRun = moment.tz(timezone).add(1, 'minute');
    return nextRun.toDate();
  }
}
