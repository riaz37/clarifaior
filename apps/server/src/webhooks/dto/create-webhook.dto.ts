import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  agentId: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}
