import { BaseTool, type ToolResult } from '../base/base-tool';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { z } from 'zod';
// Note: @notionhq/client needs to be installed
// Run: npm install @notionhq/client
import { Client as NotionClient } from '@notionhq/client';

export interface NotionToolParams {
  /** Notion API token */
  auth: string;
  /** Default database ID to use for queries */
  defaultDatabaseId?: string;
  /** Whether to enable verbose logging */
  verbose?: boolean;
}

export interface QueryDatabaseParams {
  /** The database ID to query */
  database_id?: string;
  /** Filter conditions */
  filter?: any;
  /** Sort conditions */
  sorts?: any[];
  /** Maximum number of items to return */
  page_size?: number;
  /** Cursor for pagination */
  start_cursor?: string;
}

export interface CreatePageParams {
  /** The parent page or database */
  parent: {
    database_id?: string;
    page_id?: string;
  };
  /** Page properties */
  properties: Record<string, any>;
  /** Page content blocks */
  children?: any[];
  /** Whether to return the created page */
  returnPage?: boolean;
}

export interface UpdatePageParams {
  /** The page ID to update */
  page_id: string;
  /** Updated properties */
  properties?: Record<string, any>;
  /** Updated content blocks */
  children?: any[];
  /** Whether to archive the page */
  archived?: boolean;
}

export class NotionTool extends BaseTool {
  private client: NotionClient;
  private defaultDatabaseId?: string;
  protected verbose: boolean;

  constructor(params: NotionToolParams) {
    super({
      name: 'notion',
      description: 'Tool for interacting with Notion API',
      ...params
    });
    
    this.client = new NotionClient({ auth: params.auth });
    this.defaultDatabaseId = params.defaultDatabaseId;
    this.verbose = params.verbose ?? false;
  }

  protected getSchema() {
    return z.object({
      action: z.enum([
        'queryDatabase',
        'retrieveDatabase',
        'createPage',
        'retrievePage',
        'updatePage',
        'retrieveBlock',
        'retrieveBlockChildren',
        'appendBlockChildren'
      ]),
      params: z.any(),
    });
  }

  async _call(
    input: { action: string; params: any },
    _runManager?: CallbackManagerForToolRun
  ): Promise<ToolResult> {
    try {
      const { action, params } = input;
      
      if (this.verbose) {
        console.log(`Executing Notion action: ${action}`, params);
      }

      let result;
      switch (action) {
        case 'queryDatabase':
          result = await this.queryDatabase(params);
          break;
        case 'retrieveDatabase':
          result = await this.retrieveDatabase(params);
          break;
        case 'createPage':
          result = await this.createPage(params);
          break;
        case 'retrievePage':
          result = await this.retrievePage(params);
          break;
        case 'updatePage':
          result = await this.updatePage(params);
          break;
        case 'retrieveBlock':
          result = await this.retrieveBlock(params);
          break;
        case 'retrieveBlockChildren':
          result = await this.retrieveBlockChildren(params);
          break;
        case 'appendBlockChildren':
          result = await this.appendBlockChildren(params);
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      return { output: result, success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { output: { error: errorMessage }, success: false };
    }
  }

  /**
   * Query a Notion database
   */
  async queryDatabase(params: QueryDatabaseParams) {
    const databaseId = params.database_id || this.defaultDatabaseId;
    if (!databaseId) {
      throw new Error('No database ID specified and no default database set');
    }

    const queryParams: any = {
      database_id: databaseId,
      ...(params.filter && { filter: params.filter }),
      ...(params.sorts && { sorts: params.sorts }),
      ...(params.page_size && { page_size: params.page_size }),
      ...(params.start_cursor && { start_cursor: params.start_cursor }),
    };

    const response = await this.client.databases.query(queryParams);
    return response;
  }

  /**
   * Retrieve a Notion database
   */
  async retrieveDatabase(params: { database_id: string }) {
    const response = await this.client.databases.retrieve({
      database_id: params.database_id,
    });
    return response;
  }

  /**
   * Create a new page in Notion
   */
  async createPage(params: CreatePageParams) {
    const { returnPage = false, ...pageParams } = params;
    
    const page = await this.client.pages.create({
      ...pageParams,
    });

    if (returnPage) {
      return page;
    }

    return {
      id: page.id,
      url: page.url,
      created_time: page.created_time,
    };
  }

  /**
   * Retrieve a Notion page
   */
  async retrievePage(params: { page_id: string }) {
    const response = await this.client.pages.retrieve({
      page_id: params.page_id,
    });
    return response;
  }

  /**
   * Update a Notion page
   */
  async updatePage(params: UpdatePageParams) {
    const { page_id, properties, archived, children } = params;
    
    const updateParams: any = {
      page_id,
      ...(properties && { properties }),
      ...(archived !== undefined && { archived }),
    };

    const page = await this.client.pages.update(updateParams);

    // Append children blocks if provided
    if (children && children.length > 0) {
      await this.appendBlockChildren({
        block_id: page_id,
        children,
      });
    }

    return page;
  }

  /**
   * Retrieve a Notion block
   */
  async retrieveBlock(params: { block_id: string }) {
    const response = await this.client.blocks.retrieve({
      block_id: params.block_id,
    });
    return response;
  }

  /**
   * Retrieve block children
   */
  async retrieveBlockChildren(params: { block_id: string; page_size?: number; start_cursor?: string }) {
    const response = await this.client.blocks.children.list({
      block_id: params.block_id,
      ...(params.page_size && { page_size: params.page_size }),
      ...(params.start_cursor && { start_cursor: params.start_cursor }),
    });
    return response;
  }

  /**
   * Append block children
   */
  async appendBlockChildren(params: { block_id: string; children: any[] }) {
    const response = await this.client.blocks.children.append({
      block_id: params.block_id,
      children: params.children,
    });
    return response;
  }

  /**
   * Search Notion
   */
  async search(params: {
    query?: string;
    filter?: {
      value: 'page' | 'database';
      property: 'object';
    };
    sort?: {
      direction: 'ascending' | 'descending';
      timestamp: 'last_edited_time';
    };
    page_size?: number;
    start_cursor?: string;
  }) {
    const response = await this.client.search({
      ...params,
    });
    return response;
  }
}
