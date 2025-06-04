import {
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FlowDefinition } from '@repo/types';

export class CreateAgentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  flowDefinition?: FlowDefinition;

  @IsOptional()
  metadata?: Record<string, any>;
}
