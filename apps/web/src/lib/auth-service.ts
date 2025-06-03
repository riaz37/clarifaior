import { api, TokenManager, ApiResponse } from "./api-client";
import { User, LoginRequest, RegisterRequest } from "@repo/types";

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OAuthUrlResponse {
  url: string;
  state: string;
}

export class AuthService {
  // Login with email and password
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", credentials);

    if (response.success && response.data) {
      const { accessToken, refreshToken, user } = response.data;

      // Store tokens securely
      TokenManager.setTokens(accessToken, refreshToken);

      // Store user data
      if (typeof window !== "undefined") {
        localStorage.setItem("clarifaior_user", JSON.stringify(user));
      }

      return response.data;
    }

    throw new Error(response.message || "Login failed");
  }

  // Register new user
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/register", userData);

    if (response.success && response.data) {
      const { accessToken, refreshToken, user } = response.data;

      // Store tokens securely
      TokenManager.setTokens(accessToken, refreshToken);

      // Store user data
      if (typeof window !== "undefined") {
        localStorage.setItem("clarifaior_user", JSON.stringify(user));
      }

      return response.data;
    }

    throw new Error(response.message || "Registration failed");
  }

  // Logout user
  static async logout(): Promise<void> {
    try {
      const refreshToken = TokenManager.getRefreshToken();

      if (refreshToken) {
        // Notify server to invalidate tokens
        await api.post("/auth/logout", { refreshToken });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage regardless of server response
      TokenManager.clearTokens();

      // Redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  // Get current user from token
  static getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;

    try {
      const userStr = localStorage.getItem("clarifaior_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = TokenManager.getAccessToken();
    return token !== null && !TokenManager.isTokenExpired(token);
  }

  // Refresh access token
  static async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = TokenManager.getRefreshToken();

      if (!refreshToken || TokenManager.isTokenExpired(refreshToken)) {
        throw new Error("No valid refresh token");
      }

      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
      }>("/auth/refresh", {
        refreshToken,
      });

      if (response.success && response.data) {
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        TokenManager.setTokens(accessToken, newRefreshToken);
        return accessToken;
      }

      throw new Error("Token refresh failed");
    } catch (error) {
      console.error("Token refresh error:", error);
      TokenManager.clearTokens();
      return null;
    }
  }

  // Get OAuth URL for Google
  static async getGoogleOAuthUrl(): Promise<string> {
    const response = await api.get<OAuthUrlResponse>("/auth/google/url");

    if (response.success && response.data) {
      // Store state for CSRF protection
      if (typeof window !== "undefined") {
        sessionStorage.setItem("oauth_state", response.data.state);
      }
      return response.data.url;
    }

    throw new Error("Failed to get OAuth URL");
  }

  // Get OAuth URL for GitHub
  static async getGitHubOAuthUrl(): Promise<string> {
    const response = await api.get<OAuthUrlResponse>("/auth/github/url");

    if (response.success && response.data) {
      // Store state for CSRF protection
      if (typeof window !== "undefined") {
        sessionStorage.setItem("oauth_state", response.data.state);
      }
      return response.data.url;
    }

    throw new Error("Failed to get OAuth URL");
  }

  // Handle OAuth callback
  static async handleOAuthCallback(
    code: string,
    state: string,
    provider: "google" | "github",
  ): Promise<AuthResponse> {
    // Verify state for CSRF protection
    if (typeof window !== "undefined") {
      const storedState = sessionStorage.getItem("oauth_state");
      if (storedState !== state) {
        throw new Error("Invalid OAuth state");
      }
      sessionStorage.removeItem("oauth_state");
    }

    const response = await api.post<AuthResponse>(
      `/auth/${provider}/callback`,
      {
        code,
        state,
      },
    );

    if (response.success && response.data) {
      const { accessToken, refreshToken, user } = response.data;

      // Store tokens securely
      TokenManager.setTokens(accessToken, refreshToken);

      // Store user data
      if (typeof window !== "undefined") {
        localStorage.setItem("clarifaior_user", JSON.stringify(user));
      }

      return response.data;
    }

    throw new Error(response.message || "OAuth authentication failed");
  }

  // Forgot password
  static async forgotPassword(email: string): Promise<void> {
    const response = await api.post("/auth/forgot-password", { email });

    if (!response.success) {
      throw new Error(response.message || "Failed to send reset email");
    }
  }

  // Reset password
  static async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<void> {
    const response = await api.post("/auth/reset-password", {
      token,
      password: newPassword,
    });

    if (!response.success) {
      throw new Error(response.message || "Failed to reset password");
    }
  }

  // Change password (authenticated user)
  static async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const response = await api.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });

    if (!response.success) {
      throw new Error(response.message || "Failed to change password");
    }
  }

  // Verify email
  static async verifyEmail(token: string): Promise<void> {
    const response = await api.post("/auth/verify-email", { token });

    if (!response.success) {
      throw new Error(response.message || "Email verification failed");
    }
  }

  // Resend verification email
  static async resendVerificationEmail(): Promise<void> {
    const response = await api.post("/auth/resend-verification");

    if (!response.success) {
      throw new Error(
        response.message || "Failed to resend verification email",
      );
    }
  }
}

// Auth context helper
export const useAuthToken = () => {
  return TokenManager.getAccessToken();
};

// Check if user has specific permission
export const hasPermission = (permission: string): boolean => {
  const user = AuthService.getCurrentUser();
  return user?.permissions?.includes(permission) || false;
};

// Check if user has specific role
export const hasRole = (role: string): boolean => {
  const user = AuthService.getCurrentUser();
  return user?.role === role;
};

export default AuthService;
