import { Injectable, BadRequestException } from '@nestjs/common';
import { Client } from '@notionhq/client';
import { LoggerService } from '../../common/services/logger.service';
import { NotionPageRequest } from '../integration.service';

@Injectable()
export class NotionService {
  private client: Client;

  constructor(private logger: LoggerService) {
    this.logger.setContext('NotionService');

    const token = process.env.NOTION_TOKEN;
    if (!token) {
      this.logger.warn('Notion token not configured');
      return;
    }

    this.client = new Client({ auth: token });
  }

  async createPage(request: NotionPageRequest): Promise<any> {
    if (!this.client) {
      throw new BadRequestException('Notion integration not configured');
    }

    const { database, title, properties } = request;

    this.logger.log(`Creating Notion page`, {
      database,
      title,
      propertyCount: Object.keys(properties).length,
    });

    try {
      const response = await this.client.pages.create({
        parent: {
          database_id: database,
        },
        properties: {
          // Title property (usually required)
          Name: {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
          // Additional properties
          ...this.formatProperties(properties),
        },
      });

      this.logger.log(`Notion page created successfully`, {
        pageId: response.id,
        database,
        title,
      });

      return {
        pageId: response.id,
        url: response.url,
        title,
        createdTime: response.created_time,
      };
    } catch (error) {
      this.logger.error(`Notion page creation failed`, error.stack, {
        database,
        title,
        error: error.message,
      });

      if (error.code === 'object_not_found') {
        throw new BadRequestException(
          `Notion database '${database}' not found`,
        );
      } else if (error.code === 'unauthorized') {
        throw new BadRequestException(
          'Invalid Notion token or insufficient permissions',
        );
      } else if (error.code === 'validation_error') {
        throw new BadRequestException(
          `Notion validation error: ${error.message}`,
        );
      }

      throw new BadRequestException(
        `Notion page creation failed: ${error.message}`,
      );
    }
  }

  async getDatabases(): Promise<any[]> {
    if (!this.client) {
      throw new BadRequestException('Notion integration not configured');
    }

    try {
      const response = await this.client.search({
        filter: {
          property: 'object',
          value: 'database',
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
      });

      return response.results.map((db: any) => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled',
        url: db.url,
        lastEditedTime: db.last_edited_time,
        properties: Object.keys(db.properties || {}),
      }));
    } catch (error) {
      this.logger.error('Failed to get Notion databases', error.stack);
      throw new BadRequestException(
        `Failed to get Notion databases: ${error.message}`,
      );
    }
  }

  async getDatabaseProperties(databaseId: string): Promise<any> {
    if (!this.client) {
      throw new BadRequestException('Notion integration not configured');
    }

    try {
      const response = await this.client.databases.retrieve({
        database_id: databaseId,
      });

      const properties = Object.entries(response.properties || {}).map(
        ([name, prop]: [string, any]) => ({
          name,
          type: prop.type,
          id: prop.id,
          required: prop.required || false,
          options: prop.select?.options || prop.multi_select?.options || [],
        }),
      );

      return {
        id: response.id,
        title: response.title?.[0]?.plain_text || 'Untitled',
        properties,
      };
    } catch (error) {
      this.logger.error(
        'Failed to get Notion database properties',
        error.stack,
      );
      throw new BadRequestException(
        `Failed to get database properties: ${error.message}`,
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const response = await this.client.users.me();

      if (response.id) {
        this.logger.log('Notion connection test successful', {
          userId: response.id,
          name: response.name,
        });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Notion connection test failed', error.stack);
      return false;
    }
  }

  private formatProperties(
    properties: Record<string, any>,
  ): Record<string, any> {
    const formatted: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string') {
        formatted[key] = {
          rich_text: [
            {
              text: {
                content: value,
              },
            },
          ],
        };
      } else if (typeof value === 'number') {
        formatted[key] = {
          number: value,
        };
      } else if (typeof value === 'boolean') {
        formatted[key] = {
          checkbox: value,
        };
      } else if (Array.isArray(value)) {
        formatted[key] = {
          multi_select: value.map((item) => ({ name: item })),
        };
      } else if (value && typeof value === 'object') {
        // Handle complex property types
        formatted[key] = value;
      }
    }

    return formatted;
  }
}
