import {
  IsString,
  IsEnum,
  IsObject,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NodeType } from '@repo/types';

export class CreateNodeDto {
  @IsString()
  id: string;

  @IsEnum([
    'trigger_gmail',
    'trigger_slack',
    'trigger_webhook',
    'trigger_scheduler',
    'prompt_llm',
    'prompt_memory',
    'action_slack',
    'action_notion',
    'action_email',
    'action_webhook',
    'condition',
    'transformer',
  ])
  type: NodeType;

  @IsString()
  label: string;

  @ValidateNested()
  @Type(() => Object)
  position: { x: number; y: number };

  @IsObject()
  data: Record<string, any>;

  @IsOptional()
  @IsObject()
  style?: Record<string, any>;

  @IsOptional()
  @IsString()
  className?: string;
}
