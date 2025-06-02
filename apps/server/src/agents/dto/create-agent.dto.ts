import {
  IsString,
  IsOptional,
  IsNumber,
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

  @IsNumber()
  workspaceId: number;

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
