import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import {
  agents,
  agentVersions,
  workspaceMembers,
} from 'database/src/db/schema';
import {
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
  PaginationQuery,
} from '@repo/types';
import { DatabaseService } from '../common/services/database.service';
import { ValidationService } from '../common/services/validation.service';
import { LoggerService } from '../common/services/logger.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    private databaseService: DatabaseService,
    private validationService: ValidationService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('AgentsService');
  }

  async create(createAgentDto: CreateAgentDto, userId: number): Promise<Agent> {
    const {
      name,
      description,
      workspaceId,
      isPublic,
      flowDefinition,
      metadata,
    } = createAgentDto;

    this.logger.log(`Creating agent: ${name} for workspace: ${workspaceId}`, {
      userId,
      workspaceId,
    });

    // Verify user has access to workspace
    await this.verifyWorkspaceAccess(userId, workspaceId);

    // Validate flow definition if provided
    if (flowDefinition) {
      const validation =
        this.validationService.isValidFlowDefinition(flowDefinition);
      if (!validation.valid) {
        throw new BadRequestException(
          `Invalid flow definition: ${validation.errors.join(', ')}`,
        );
      }
    }

    const [newAgent] = await this.databaseService.db
      .insert(agents)
      .values({
        name,
        description,
        workspaceId,
        createdBy: userId,
        isPublic: isPublic || false,
        flowDefinition,
        metadata,
      })
      .returning();

    // Create initial version if flow definition is provided
    if (flowDefinition) {
      await this.createVersion(
        newAgent.id,
        flowDefinition,
        'v1.0.0',
        'Initial version',
        userId,
      );
    }

    this.logger.log(`Agent created successfully: ${newAgent.id}`, {
      userId,
      agentId: newAgent.id,
      workspaceId,
    });

    return this.mapToAgentResponse(newAgent);
  }

  async findAll(
    workspaceId: number,
    pagination: PaginationQuery,
  ): Promise<any> {
    this.logger.log(`Fetching agents for workspace: ${workspaceId}`);

    const query = this.databaseService.db
      .select()
      .from(agents)
      .where(eq(agents.workspaceId, workspaceId))
      .orderBy(desc(agents.updatedAt));

    return this.databaseService.paginate(query, pagination);
  }

  async findOne(id: number, userId: number): Promise<Agent> {
    const agent = await this.getAgentWithAccess(id, userId);
    return this.mapToAgentResponse(agent);
  }

  async update(
    id: number,
    updateAgentDto: UpdateAgentDto,
    userId: number,
  ): Promise<Agent> {
    const agent = await this.getAgentWithAccess(id, userId);

    this.logger.log(`Updating agent: ${id}`, {
      userId,
      agentId: id,
    });

    // Validate flow definition if provided
    if (updateAgentDto.flowDefinition) {
      const validation = this.validationService.isValidFlowDefinition(
        updateAgentDto.flowDefinition,
      );
      if (!validation.valid) {
        throw new BadRequestException(
          `Invalid flow definition: ${validation.errors.join(', ')}`,
        );
      }
    }

    const [updatedAgent] = await this.databaseService.db
      .update(agents)
      .set({
        ...updateAgentDto,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning();

    // Create new version if flow definition changed
    if (
      updateAgentDto.flowDefinition &&
      JSON.stringify(updateAgentDto.flowDefinition) !==
        JSON.stringify(agent.flowDefinition)
    ) {
      const versions = await this.getVersions(id);
      const nextVersion = this.generateNextVersion(versions);
      await this.createVersion(
        id,
        updateAgentDto.flowDefinition,
        nextVersion,
        'Flow updated',
        userId,
      );
    }

    this.logger.log(`Agent updated successfully: ${id}`, {
      userId,
      agentId: id,
    });

    return this.mapToAgentResponse(updatedAgent);
  }

  async remove(id: number, userId: number): Promise<void> {
    const agent = await this.getAgentWithAccess(id, userId);

    this.logger.log(`Deleting agent: ${id}`, {
      userId,
      agentId: id,
    });

    await this.databaseService.db.delete(agents).where(eq(agents.id, id));

    this.logger.log(`Agent deleted successfully: ${id}`, {
      userId,
      agentId: id,
    });
  }

  async getVersions(agentId: number): Promise<any[]> {
    return this.databaseService.db
      .select()
      .from(agentVersions)
      .where(eq(agentVersions.agentId, agentId))
      .orderBy(desc(agentVersions.createdAt));
  }

  private async createVersion(
    agentId: number,
    flowDefinition: any,
    version: string,
    changelog: string,
    userId: number,
  ): Promise<void> {
    await this.databaseService.db.insert(agentVersions).values({
      agentId,
      version,
      flowDefinition,
      changelog,
      createdBy: userId,
    });
  }

  private async getAgentWithAccess(
    agentId: number,
    userId: number,
  ): Promise<any> {
    const [agent] = await this.databaseService.db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Verify user has access to the workspace
    await this.verifyWorkspaceAccess(userId, agent.workspaceId);

    return agent;
  }

  private async verifyWorkspaceAccess(
    userId: number,
    workspaceId: number,
  ): Promise<void> {
    const hasAccess = await this.databaseService.exists(
      workspaceMembers,
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to workspace');
    }
  }

  private mapToAgentResponse(agent: any): Agent {
    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      workspaceId: agent.workspaceId,
      createdBy: agent.createdBy,
      status: agent.status,
      isPublic: agent.isPublic,
      flowDefinition: agent.flowDefinition,
      metadata: agent.metadata,
      createdAt: agent.createdAt?.toISOString(),
      updatedAt: agent.updatedAt?.toISOString(),
    };
  }

  private generateNextVersion(versions: any[]): string {
    if (versions.length === 0) return 'v1.0.0';

    const latestVersion = versions[0].version;
    const match = latestVersion.match(/v(\d+)\.(\d+)\.(\d+)/);

    if (match) {
      const [, major, minor, patch] = match;
      return `v${major}.${parseInt(minor) + 1}.0`;
    }

    return 'v1.0.0';
  }
}
