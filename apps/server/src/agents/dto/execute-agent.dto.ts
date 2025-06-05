import { IsOptional, IsObject, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteAgentDto {
  @ApiPropertyOptional({
    description: 'Trigger data for the agent execution',
    type: 'object',
    additionalProperties: true,
    example: { key: 'value' },
  })
  @IsOptional()
  @IsObject()
  triggerData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional context for the execution',
    type: 'object',
    additionalProperties: true,
    example: { userId: 'user-123' },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether to run in test mode',
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  testMode: boolean = false;
}
