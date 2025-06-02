import { ApiResponse, PaginatedResponse } from '@repo/types';

export class ResponseUtil {
  /**
   * Create success response
   */
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  /**
   * Create error response
   */
  static error(message: string, error?: string): ApiResponse {
    return {
      success: false,
      message,
      error,
    };
  }

  /**
   * Create paginated success response
   */
  static paginated<T>(
    paginatedData: PaginatedResponse<T>,
  ): ApiResponse<PaginatedResponse<T>> {
    return {
      success: true,
      data: paginatedData,
    };
  }

  /**
   * Create created response (201)
   */
  static created<T>(
    data: T,
    message = 'Resource created successfully',
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  /**
   * Create updated response
   */
  static updated<T>(
    data: T,
    message = 'Resource updated successfully',
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  /**
   * Create deleted response
   */
  static deleted(message = 'Resource deleted successfully'): ApiResponse {
    return {
      success: true,
      message,
    };
  }
}
