import { ApiProperty } from '@nestjs/swagger';
import type { Agent } from '@repo/types';

export class AgentResponseDto {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Response message', required: false })
  message?: string;

  @ApiProperty({ description: 'Agent data', type: Object })
  data: Agent;
}

export class AgentListResponseDto {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success: boolean;

  @ApiProperty({
    description: 'List of agents',
    type: [Object],
  })
  data: Agent[];

  @ApiProperty({
    description: 'Pagination information',
    type: 'object',
    properties: {
      total: { type: 'number', example: 10 },
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 10 },
      totalPages: { type: 'number', example: 1 },
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
