import { IsOptional, IsObject } from 'class-validator';

export class ExecuteAgentDto {
  @IsOptional()
  @IsObject()
  triggerData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  testMode?: boolean = false;
}
