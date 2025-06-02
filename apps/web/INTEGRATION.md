# 🔗 Frontend-Backend Integration Guide

This guide explains how to connect the Clarifaior frontend to the backend API.

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment file and configure your API endpoints:

```bash
cp .env.example .env.local
```

Update `.env.local` with your backend configuration:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Backend Integration
NEXT_PUBLIC_USE_REAL_API=true
```

### 2. Backend Requirements

Ensure your backend API provides these endpoints:

#### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Token refresh
- `GET /auth/google/url` - Google OAuth URL
- `GET /auth/github/url` - GitHub OAuth URL
- `POST /auth/google/callback` - Google OAuth callback
- `POST /auth/github/callback` - GitHub OAuth callback

#### Agent Endpoints
- `GET /agents` - List agents
- `GET /agents/:id` - Get agent details
- `POST /agents` - Create agent
- `PUT /agents/:id` - Update agent
- `DELETE /agents/:id` - Delete agent
- `POST /agents/:id/execute` - Execute agent
- `POST /agents/:id/deploy` - Deploy agent
- `POST /agents/:id/pause` - Pause agent

#### Execution Endpoints
- `GET /executions` - List executions
- `GET /executions/:id` - Get execution details
- `POST /executions/:id/cancel` - Cancel execution
- `POST /executions/:id/retry` - Retry execution
- `GET /executions/:id/logs` - Get execution logs
- `GET /executions/metrics` - Get execution metrics

#### Integration Endpoints
- `GET /integrations` - List integrations
- `GET /integrations/:id` - Get integration details
- `POST /integrations` - Connect integration
- `PUT /integrations/:id` - Update integration
- `DELETE /integrations/:id` - Disconnect integration
- `POST /integrations/:id/test` - Test integration

#### Trigger Endpoints
- `GET /triggers` - List triggers
- `GET /triggers/:id` - Get trigger details
- `POST /triggers` - Create trigger
- `PUT /triggers/:id` - Update trigger
- `DELETE /triggers/:id` - Delete trigger
- `PATCH /triggers/:id` - Toggle trigger status

#### User Endpoints
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `GET /user/workspaces` - Get user workspaces
- `POST /workspaces` - Create workspace

### 3. API Response Format

All API responses should follow this format:

```typescript
interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  timestamp?: string;
  requestId?: string;
}
```

### 4. Error Handling

Errors should be returned with appropriate HTTP status codes:

```typescript
interface ApiError {
  message: string;
  code?: string;
  details?: any;
  timestamp?: string;
  requestId?: string;
}
```

## 🔧 Integration Features

### Authentication
- ✅ JWT token management with automatic refresh
- ✅ OAuth integration (Google, GitHub)
- ✅ Protected routes with role/permission checks
- ✅ Session management and timeout handling

### Data Fetching
- ✅ React Query for optimized caching
- ✅ Real-time updates for running executions
- ✅ Automatic retry with exponential backoff
- ✅ Background refetching and cache invalidation

### Error Handling
- ✅ Centralized error classification and logging
- ✅ User-friendly error messages
- ✅ Retry logic for recoverable errors
- ✅ Toast notifications for user feedback

### Real-time Updates
- ✅ WebSocket connection for live updates
- ✅ Auto-refresh for running executions
- ✅ Connection recovery and reconnection
- ✅ Event-based state synchronization

## 🎯 Usage Examples

### Making API Calls

```typescript
import { useAgents, useCreateAgent } from '../lib/react-query';

function AgentsPage() {
  const { data: agents, isLoading } = useAgents();
  const { mutate: createAgent } = useCreateAgent();

  const handleCreate = (agentData) => {
    createAgent(agentData, {
      onSuccess: () => toast.success('Agent created!'),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div>
      {isLoading ? <Spinner /> : agents?.map(agent => ...)}
    </div>
  );
}
```

### Error Handling

```typescript
import { useErrorHandler } from '../lib/error-handler';

function MyComponent() {
  const { handleError, handleAsyncError } = useErrorHandler();

  const handleAction = async () => {
    const result = await handleAsyncError(
      () => api.post('/agents', data),
      { context: 'create-agent' }
    );
    
    if (result) {
      toast.success('Success!');
    }
  };
}
```

### Authentication

```typescript
import { useAuth } from '../lib/auth-guard';

function ProtectedComponent() {
  const { user, isAuthenticated, hasRole, hasPermission } = useAuth();

  if (!isAuthenticated) return <LoginPrompt />;
  if (!hasRole('admin')) return <AccessDenied />;

  return <AdminPanel />;
}
```

## 🔒 Security Features

### Token Management
- Secure JWT storage in localStorage
- Automatic token refresh before expiration
- Token validation and cleanup on errors
- CSRF protection with request IDs

### Request Security
- Request/response interceptors
- Automatic authentication headers
- Rate limiting handling
- Request timeout management

### OAuth Security
- State parameter validation
- Secure redirect handling
- Token exchange validation
- Provider verification

## 📊 Monitoring & Debugging

### Development Tools
- React Query DevTools for cache inspection
- Console logging for API requests/responses
- Error boundary for component error handling
- Request timing and performance metrics

### Production Monitoring
- Error logging integration (ready for Sentry)
- Performance monitoring
- User session tracking
- API usage analytics

## 🚀 Deployment

### Environment Variables

For production deployment, set these environment variables:

```env
NEXT_PUBLIC_API_URL=https://api.clarifaior.com
NEXT_PUBLIC_WS_URL=wss://api.clarifaior.com
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_USE_REAL_API=true
```

### Build & Deploy

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start production server
npm start
```

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend allows frontend origin
2. **Token Refresh Loops**: Check token expiration handling
3. **WebSocket Connection**: Verify WS URL and authentication
4. **OAuth Redirects**: Confirm OAuth callback URLs

### Debug Mode

Enable debug mode for detailed logging:

```env
NEXT_PUBLIC_DEBUG_MODE=true
```

This will show:
- API request/response details
- Token refresh attempts
- WebSocket connection status
- Error stack traces

## 📝 API Documentation

For complete API documentation, refer to your backend API docs. The frontend is designed to work with RESTful APIs following standard HTTP conventions.

### Expected Data Types

The frontend expects data types as defined in `@repo/types`. Ensure your backend returns data matching these TypeScript interfaces.

## 🎯 Next Steps

1. **Start Backend**: Ensure your backend API is running
2. **Configure Environment**: Update `.env.local` with correct URLs
3. **Test Authentication**: Try login/register flows
4. **Verify Data Flow**: Check if data loads correctly
5. **Test Real-time**: Verify WebSocket connections
6. **Monitor Errors**: Check console for any issues

The frontend is now fully integrated and ready to work with your backend API! 🚀
