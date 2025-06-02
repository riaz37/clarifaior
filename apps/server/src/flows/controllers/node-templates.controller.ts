import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { NodeTemplatesService } from '../services/node-templates.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { ResponseUtil } from '../../common/utils/response.util';

@Controller('node-templates')
@UseGuards(JwtAuthGuard)
export class NodeTemplatesController {
  constructor(private readonly nodeTemplatesService: NodeTemplatesService) {}

  @Get()
  @RequirePermissions(Permission.AGENT_READ)
  async getAllTemplates(@Query('category') category?: string) {
    if (category) {
      const templates =
        this.nodeTemplatesService.getTemplatesByCategory(category);
      return ResponseUtil.success(templates);
    }

    const templates = this.nodeTemplatesService.getAllTemplates();
    return ResponseUtil.success(templates);
  }

  @Get(':type')
  @RequirePermissions(Permission.AGENT_READ)
  async getTemplate(@Param('type') type: string) {
    const template = this.nodeTemplatesService.getTemplate(type as any);

    if (!template) {
      return ResponseUtil.error('Node template not found');
    }

    return ResponseUtil.success(template);
  }

  @Get('categories/list')
  @RequirePermissions(Permission.AGENT_READ)
  async getCategories() {
    const categories = [
      {
        id: 'trigger',
        name: 'Triggers',
        description: 'Start your automation flows',
      },
      {
        id: 'ai',
        name: 'AI & LLM',
        description: 'AI-powered processing nodes',
      },
      {
        id: 'action',
        name: 'Actions',
        description: 'Perform actions and send data',
      },
      {
        id: 'logic',
        name: 'Logic',
        description: 'Control flow and transform data',
      },
    ];

    return ResponseUtil.success(categories);
  }
}
