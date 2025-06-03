import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_TIMEOUT = 30000;

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // Include cookies for CSRF protection
});

// Token management utilities
const TokenManager = {
  getAccessToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("clarifaior_access_token");
  },

  getRefreshToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("clarifaior_refresh_token");
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem("clarifaior_access_token", accessToken);
    localStorage.setItem("clarifaior_refresh_token", refreshToken);
  },

  clearTokens: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("clarifaior_access_token");
    localStorage.removeItem("clarifaior_refresh_token");
    localStorage.removeItem("clarifaior_user");
  },

  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  },
};

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = TokenManager.getAccessToken();

    if (token && !TokenManager.isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    config.headers["X-Request-ID"] = crypto.randomUUID();

    // Add timestamp for request timing
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response timing in development
    if (process.env.NODE_ENV === "development") {
      const duration = Date.now() - response.config.metadata?.startTime;
      console.log(
        `API ${response.config.method?.toUpperCase()} ${response.config.url}: ${duration}ms`,
      );
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = TokenManager.getRefreshToken();

      if (refreshToken && !TokenManager.isTokenExpired(refreshToken)) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } =
            response.data.data;
          TokenManager.setTokens(accessToken, newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          TokenManager.clearTokens();

          // Redirect to login only if not already on auth pages
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.includes("/login") &&
            !window.location.pathname.includes("/register")
          ) {
            window.location.href = "/login?expired=true";
          }
        }
      } else {
        TokenManager.clearTokens();
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/register")
        ) {
          window.location.href = "/login";
        }
      }
    }

    // Handle 403 Forbidden - Insufficient permissions
    if (error.response?.status === 403) {
      console.error("Access forbidden:", error.response.data);
      // Could show a permission denied modal here
    }

    // Handle 429 Too Many Requests - Rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"];
      console.warn(`Rate limited. Retry after: ${retryAfter} seconds`);
      // Could implement exponential backoff here
    }

    return Promise.reject(error);
  },
);

// API Response types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp?: string;
  requestId?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  timestamp?: string;
  requestId?: string;
}

// Generic API methods with proper typing
export const api = {
  // GET request
  get: async <T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.get(url, config);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  // POST request
  post: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.post(url, data, config);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  // PUT request
  put: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.put(url, data, config);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  // PATCH request
  patch: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  // DELETE request
  delete: async <T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.delete(url, config);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },

  // File upload with progress
  upload: async <T = any>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void,
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.post(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress(progress);
          }
        },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  },
};

// Centralized error handling
export const handleApiError = (error: AxiosError): ApiError => {
  const response = error.response;
  const request = error.request;

  // Network error
  if (!response && request) {
    return {
      message: "Network error. Please check your internet connection.",
      code: "NETWORK_ERROR",
    };
  }

  // Request timeout
  if (error.code === "ECONNABORTED") {
    return {
      message: "Request timeout. Please try again.",
      code: "TIMEOUT_ERROR",
    };
  }

  // Server responded with error
  if (response) {
    const errorData = response.data as any;

    return {
      message: errorData?.message || `Server error (${response.status})`,
      code: errorData?.code || `HTTP_${response.status}`,
      details: errorData?.details,
      timestamp: errorData?.timestamp,
      requestId: errorData?.requestId,
    };
  }

  // Unknown error
  return {
    message: error.message || "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
  };
};

// Export token manager for use in auth components
export { TokenManager };

// Export the configured axios instance for direct use if needed
export { apiClient };

export default api;
