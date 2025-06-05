import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AgentStatus, FlowDefinition } from '@repo/types';

export class UpdateAgentDto {
  @ApiPropertyOptional({
    description: 'Name of the agent',
    example: 'Updated Customer Support Bot',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the agent',
    example: 'Updated description for customer support',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Status of the agent',
    enum: ['draft', 'active', 'paused', 'archived'],
    example: 'active',
  })
  @IsOptional()
  @IsEnum(['draft', 'active', 'paused', 'archived'])
  status?: AgentStatus;

  @ApiPropertyOptional({
    description: 'Whether the agent is publicly accessible',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Flow definition for the agent',
    type: 'object',
    additionalProperties: true,
    example: {
      nodes: [],
      edges: [],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  flowDefinition?: FlowDefinition;

  @IsOptional()
  metadata?: Record<string, any>;
}
