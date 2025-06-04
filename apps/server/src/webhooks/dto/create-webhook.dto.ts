import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  agentId: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}
