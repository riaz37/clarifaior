// User role types
export type UserRole = 'super_admin' | 'admin' | 'user';

// User preferences interface
export interface UserPreferences {
  notifications: boolean;
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  language: string;
}

// Authentication Types
export interface User {
  id: string;
  email: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  email_verified: boolean;
  email_verification_token?: string;
  reset_password_token?: string;
  reset_password_expires?: Date;
  role: UserRole;
  is_active: boolean;
  last_login_at?: Date;
  preferences: UserPreferences;
  created_at: Date;
  updated_at: Date;
}

// Auth response interfaces
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: Omit<User, 'password_hash'>;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Request interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}

// JWT Payload
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Password reset interfaces
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// Email verification
export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}
