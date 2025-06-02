import { IsOptional, ValidateNested, IsObject, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { FlowDefinition, FlowNode, FlowEdge } from '@repo/types';

export class UpdateFlowDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  flowDefinition?: FlowDefinition;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  nodes?: FlowNode[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  edges?: FlowEdge[];

  @IsOptional()
  @IsObject()
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
