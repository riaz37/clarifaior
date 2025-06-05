import {
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FlowDefinition } from '@repo/types';

export class CreateAgentDto {
  @ApiProperty({
    description: 'Name of the agent',
    example: 'Customer Support Bot',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the agent',
    example: 'Handles customer support inquiries',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'ID of the workspace this agent belongs to',
    format: 'uuid',
  })
  @IsUUID()
  workspaceId: string;

  @ApiPropertyOptional({
    description: 'Whether the agent is publicly accessible',
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic: boolean = false;

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

  @ApiPropertyOptional({
    description: 'Additional metadata for the agent',
    type: 'object',
    additionalProperties: true,
    example: {
      version: '1.0',
      category: 'support',
    },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
