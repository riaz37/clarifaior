import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SchedulerService, CreateScheduleDto } from './scheduler.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '../auth/rbac/permissions';
import { ResponseUtil } from '../common/utils/response.util';
import { LoggerService } from '../common/services/logger.service';

@Controller()
@UseGuards(JwtAuthGuard, RbacGuard)
export class SchedulerController {
  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SchedulerController');
  }

  @Post('agents/:agentId/schedules')
  @RequirePermissions(Permission.AGENT_UPDATE)
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(
    @Param('agentId') agentId: string,
    @Body() createScheduleDto: Omit<CreateScheduleDto, 'agentId'>,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Creating schedule for agent: ${agentId}`, {
      userId: user.id,
      agentId: +agentId,
    });

    const schedule = await this.schedulerService.createSchedule(
      { ...createScheduleDto, agentId: +agentId },
      user.id,
    );

    return ResponseUtil.created(schedule, 'Schedule created successfully');
  }

  @Get('agents/:agentId/schedules')
  @RequirePermissions(Permission.AGENT_READ)
  async getSchedules(@Param('agentId') agentId: string) {
    const schedules = await this.schedulerService.getSchedules(+agentId);
    return ResponseUtil.success(schedules);
  }

  @Put('schedules/:scheduleId')
  @RequirePermissions(Permission.AGENT_UPDATE)
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() updates: Partial<CreateScheduleDto>,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Updating schedule: ${scheduleId}`, {
      userId: user.id,
      scheduleId: +scheduleId,
    });

    const schedule = await this.schedulerService.updateSchedule(
      +scheduleId,
      updates,
      user.id,
    );

    return ResponseUtil.updated(schedule, 'Schedule updated successfully');
  }

  @Delete('schedules/:scheduleId')
  @RequirePermissions(Permission.AGENT_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Deleting schedule: ${scheduleId}`, {
      userId: user.id,
      scheduleId: +scheduleId,
    });

    await this.schedulerService.deleteSchedule(+scheduleId, user.id);
    return ResponseUtil.deleted('Schedule deleted successfully');
  }

  @Put('schedules/:scheduleId/toggle')
  @RequirePermissions(Permission.AGENT_UPDATE)
  async toggleSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() body: { isActive: boolean },
  ) {
    this.logger.log(`Toggling schedule: ${scheduleId}`, {
      scheduleId: +scheduleId,
      isActive: body.isActive,
    });

    await this.schedulerService.toggleSchedule(+scheduleId, body.isActive);
    return ResponseUtil.success(
      { isActive: body.isActive },
      `Schedule ${body.isActive ? 'activated' : 'deactivated'} successfully`,
    );
  }

  @Get('schedules/timezones')
  @RequirePermissions(Permission.AGENT_READ)
  async getTimezones() {
    // Common timezones for the UI
    const timezones = [
      { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
      { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
      { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
      { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
      { value: 'Europe/London', label: 'London (GMT/BST)' },
      { value: 'Europe/Paris', label: 'Central European Time' },
      { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
      { value: 'Asia/Shanghai', label: 'China Standard Time' },
      { value: 'Asia/Kolkata', label: 'India Standard Time' },
      { value: 'Australia/Sydney', label: 'Australian Eastern Time' },
    ];

    return ResponseUtil.success(timezones);
  }

  @Get('schedules/cron-presets')
  @RequirePermissions(Permission.AGENT_READ)
  async getCronPresets() {
    const presets = [
      {
        label: 'Every minute',
        value: '* * * * *',
        description: 'Runs every minute',
      },
      {
        label: 'Every 5 minutes',
        value: '*/5 * * * *',
        description: 'Runs every 5 minutes',
      },
      {
        label: 'Every 15 minutes',
        value: '*/15 * * * *',
        description: 'Runs every 15 minutes',
      },
      {
        label: 'Every 30 minutes',
        value: '*/30 * * * *',
        description: 'Runs every 30 minutes',
      },
      {
        label: 'Every hour',
        value: '0 * * * *',
        description: 'Runs at the start of every hour',
      },
      {
        label: 'Every 6 hours',
        value: '0 */6 * * *',
        description: 'Runs every 6 hours',
      },
      {
        label: 'Every 12 hours',
        value: '0 */12 * * *',
        description: 'Runs every 12 hours',
      },
      {
        label: 'Daily at midnight',
        value: '0 0 * * *',
        description: 'Runs once a day at midnight',
      },
      {
        label: 'Daily at 9 AM',
        value: '0 9 * * *',
        description: 'Runs once a day at 9:00 AM',
      },
      {
        label: 'Weekly (Mondays)',
        value: '0 0 * * 1',
        description: 'Runs every Monday at midnight',
      },
      {
        label: 'Monthly (1st day)',
        value: '0 0 1 * *',
        description: 'Runs on the 1st day of every month',
      },
      {
        label: 'Weekdays only',
        value: '0 9 * * 1-5',
        description: 'Runs at 9 AM on weekdays only',
      },
    ];

    return ResponseUtil.success(presets);
  }
}
