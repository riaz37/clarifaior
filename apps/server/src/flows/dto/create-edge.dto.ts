import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateEdgeDto {
  @IsString()
  id: string;

  @IsString()
  source: string;

  @IsString()
  target: string;

  @IsOptional()
  @IsString()
  sourceHandle?: string;

  @IsOptional()
  @IsString()
  targetHandle?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsObject()
  style?: Record<string, any>;

  @IsOptional()
  @IsString()
  className?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  animated?: boolean;
}
