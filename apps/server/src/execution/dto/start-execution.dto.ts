import {
  IsNumber,
  IsOptional,
  IsObject,
  IsBoolean,
  IsString,
} from 'class-validator';

export class StartExecutionDto {
  @IsString()
  agentId: string;

  @IsOptional()
  @IsString()
  triggerType?: string;

  @IsOptional()
  @IsObject()
  triggerData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  testMode?: boolean = false;

  @IsOptional()
  @IsNumber()
  priority?: number = 0;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
