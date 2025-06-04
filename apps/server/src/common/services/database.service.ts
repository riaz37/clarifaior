import { Injectable } from '@nestjs/common';
import {db} from '@repo/database';
import { eq, desc, asc, count, sql } from 'drizzle-orm';
import { PaginationQuery, PaginatedResponse } from '@repo/types';

@Injectable()
export class DatabaseService {
  get db() {
    return db;
  }

  /**
   * Generic pagination helper
   */
  async paginate<T>(
    query: any,
    options: PaginationQuery,
  ): Promise<PaginatedResponse<T>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const offset = (page - 1) * limit;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(query.getSQL().from);

    // Get paginated data
    const data = await query.limit(limit).offset(offset).execute();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Generic sorting helper
   */
  applySorting(
    query: any,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    if (!sortBy) return query;

    const direction = sortOrder === 'asc' ? asc : desc;
    return query.orderBy(direction(sql.identifier(sortBy)));
  }

  /**
   * Check if record exists
   */
  async exists(table: any, condition: any): Promise<boolean> {
    const [result] = await db
      .select({ count: count() })
      .from(table)
      .where(condition)
      .limit(1);

    return result.count > 0;
  }

  /**
   * Soft delete helper (if we implement soft deletes)
   */
  async softDelete(table: any, id: number, userIdField = 'deletedBy') {
    return db
      .update(table)
      .set({
        deletedAt: new Date(),
        [userIdField]: id,
      })
      .where(eq(table.id, id));
  }
}
