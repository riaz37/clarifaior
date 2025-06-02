import { Injectable, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';

@Injectable()
export class ValidationService {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  isValidPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate workspace slug
   */
  isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
  }

  /**
   * Generate slug from string
   */
  generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);
  }

  /**
   * Validate JSON structure
   */
  isValidJSON(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate flow definition structure
   */
  isValidFlowDefinition(flowDef: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!flowDef || typeof flowDef !== 'object') {
      errors.push('Flow definition must be an object');
      return { valid: false, errors };
    }

    if (!Array.isArray(flowDef.nodes)) {
      errors.push('Flow definition must have a nodes array');
    }

    if (!Array.isArray(flowDef.edges)) {
      errors.push('Flow definition must have an edges array');
    }

    // Validate nodes
    if (flowDef.nodes) {
      flowDef.nodes.forEach((node: any, index: number) => {
        if (!node.id) {
          errors.push(`Node at index ${index} must have an id`);
        }
        if (!node.type) {
          errors.push(`Node at index ${index} must have a type`);
        }
        if (
          !node.position ||
          typeof node.position.x !== 'number' ||
          typeof node.position.y !== 'number'
        ) {
          errors.push(
            `Node at index ${index} must have valid position coordinates`,
          );
        }
      });
    }

    // Validate edges
    if (flowDef.edges) {
      flowDef.edges.forEach((edge: any, index: number) => {
        if (!edge.id) {
          errors.push(`Edge at index ${index} must have an id`);
        }
        if (!edge.source) {
          errors.push(`Edge at index ${index} must have a source`);
        }
        if (!edge.target) {
          errors.push(`Edge at index ${index} must have a target`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate class-validator DTO
   */
  async validateDto(dto: any): Promise<void> {
    const errors = await validate(dto);
    if (errors.length > 0) {
      const messages = errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join('; ');
      throw new BadRequestException(`Validation failed: ${messages}`);
    }
  }
}
