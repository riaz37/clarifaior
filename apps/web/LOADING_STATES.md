# 🔄 Central Loading State Management

This guide explains how to use the central loading state system in Clarifaior for consistent and professional UX.

## 🎯 Overview

The central loading state system provides:
- **Global Loading Overlay** - Full-screen loading with progress tracking
- **Component Loading States** - Skeleton screens and loading indicators
- **API Call Management** - Automatic loading states for API operations
- **Bulk Operations** - Progress tracking for multiple operations
- **Error Handling** - Integrated error handling with loading states

## 🔧 Core Components

### LoadingProvider
Wrap your app with the LoadingProvider to enable central loading management:

```tsx
import { LoadingProvider } from '../lib/loading-context';
import { LoadingOverlay } from '../components/loading/LoadingOverlay';

function App() {
  return (
    <LoadingProvider>
      <YourApp />
      <LoadingOverlay />
    </LoadingProvider>
  );
}
```

### Loading Context Hook
Access loading state throughout your app:

```tsx
import { useLoading } from '../lib/loading-context';

function MyComponent() {
  const { 
    globalLoading, 
    startLoading, 
    stopLoading, 
    isOperationLoading 
  } = useLoading();

  const handleAction = async () => {
    startLoading('my-operation', {
      text: 'Processing...',
      type: 'progress',
      overlay: true,
    });

    try {
      await someAsyncOperation();
    } finally {
      stopLoading('my-operation');
    }
  };
}
```

## 🎨 Loading Components

### LoadingOverlay
Full-screen overlay with progress tracking:

```tsx
// Automatically shown when overlay loading is active
<LoadingOverlay />
```

### LoadingSkeleton
Skeleton loading for content areas:

```tsx
import { LoadingSkeleton } from '../components/loading/LoadingOverlay';

function ContentArea() {
  return isLoading ? (
    <LoadingSkeleton lines={3} showAvatar />
  ) : (
    <ActualContent />
  );
}
```

### LoadingGrid
Grid of loading cards:

```tsx
import { LoadingGrid } from '../components/loading/LoadingOverlay';

function GridView() {
  return isLoading ? (
    <LoadingGrid count={6} />
  ) : (
    <ActualGrid />
  );
}
```

### LoadingButton
Button with integrated loading state:

```tsx
import { LoadingButton } from '../components/loading/LoadingOverlay';

function ActionButton() {
  return (
    <LoadingButton
      isLoading={isSubmitting}
      loadingText="Saving..."
      onClick={handleSave}
    >
      Save Changes
    </LoadingButton>
  );
}
```

## 🚀 Specialized Hooks

### useApiCall
Automatic loading management for API calls:

```tsx
import { useApiCall } from '../lib/loading-hooks';

function MyComponent() {
  const { call, isLoading } = useApiCall('create-agent');

  const handleCreate = async () => {
    await call(
      () => api.post('/agents', data),
      {
        loadingText: 'Creating agent...',
        successMessage: 'Agent created!',
        showOverlay: true,
      }
    );
  };
}
```

### useFormSubmission
Form submission with loading states:

```tsx
import { useFormSubmission } from '../lib/loading-hooks';

function MyForm() {
  const { submit, isSubmitting } = useFormSubmission('user-form');

  const handleSubmit = async (data) => {
    await submit(
      () => api.post('/users', data),
      {
        successMessage: 'User created successfully!',
        onSuccess: (result) => router.push('/users'),
      }
    );
  };
}
```

### useFileUpload
File upload with progress tracking:

```tsx
import { useFileUpload } from '../lib/loading-hooks';

function FileUploader() {
  const { upload, isUploading } = useFileUpload('file-upload');

  const handleUpload = async (file) => {
    await upload(
      file,
      (file, onProgress) => api.upload('/files', file, { onProgress }),
      {
        onSuccess: (result) => console.log('Upload complete:', result),
      }
    );
  };
}
```

### useBulkOperation
Bulk operations with progress tracking:

```tsx
import { useBulkOperation } from '../lib/loading-hooks';

function BulkProcessor() {
  const { execute } = useBulkOperation('bulk-process');

  const handleBulkProcess = async (items) => {
    await execute(
      items,
      (item) => api.post('/process', item),
      {
        batchSize: 5,
        onProgress: (completed, total) => {
          console.log(`${completed}/${total} completed`);
        },
      }
    );
  };
}
```

### useAuthLoading
Authentication operations:

```tsx
import { useAuthLoading } from '../lib/loading-hooks';

function LoginForm() {
  const { login, isAuthLoading } = useAuthLoading();

  const handleLogin = async (credentials) => {
    await login(() => authService.login(credentials));
  };
}
```

## 📱 Loading Types

### Spinner Loading
Simple spinner for quick operations:

```tsx
startLoading('operation', {
  text: 'Loading...',
  type: 'spinner',
  overlay: false,
});
```

### Progress Loading
Progress bar for trackable operations:

```tsx
startLoading('operation', {
  text: 'Processing...',
  type: 'progress',
  progress: 0,
  overlay: true,
});

// Update progress
updateLoading('operation', { progress: 50 });
```

### Skeleton Loading
Skeleton screens for content loading:

```tsx
startLoading('operation', {
  text: 'Loading content...',
  type: 'skeleton',
  overlay: false,
});
```

## 🎯 Best Practices

### 1. Use Appropriate Loading Types
- **Spinner**: Quick operations (< 2 seconds)
- **Progress**: Long operations with trackable progress
- **Skeleton**: Content loading and page transitions
- **Overlay**: Important operations that block interaction

### 2. Provide Meaningful Text
```tsx
// Good
startLoading('save-agent', { text: 'Saving agent configuration...' });

// Bad
startLoading('save-agent', { text: 'Loading...' });
```

### 3. Handle Cancellation
```tsx
startLoading('operation', {
  text: 'Processing...',
  cancellable: true,
  onCancel: () => {
    // Cancel the operation
    abortController.abort();
  },
});
```

### 4. Use Unique Operation IDs
```tsx
// Good - unique IDs
startLoading(`delete-agent-${agentId}`, { ... });
startLoading(`execute-agent-${agentId}`, { ... });

// Bad - generic IDs
startLoading('agent-operation', { ... });
```

### 5. Auto-cleanup with Timeouts
The system automatically stops loading after 30 seconds to prevent stuck states.

## 🔧 Advanced Usage

### Custom Loading Operation Hook
```tsx
function useCustomOperation(id: string) {
  const { start, update, stop, isLoading } = useLoadingOperation(id);

  const execute = async (operation) => {
    start({ text: 'Starting...', type: 'progress', progress: 0 });
    
    try {
      update({ text: 'Processing...', progress: 25 });
      const result = await operation();
      
      update({ text: 'Finalizing...', progress: 75 });
      await finalizeOperation(result);
      
      update({ progress: 100 });
      return result;
    } finally {
      stop();
    }
  };

  return { execute, isLoading };
}
```

### Global Loading State Access
```tsx
function GlobalLoadingIndicator() {
  const { globalLoading, operations } = useLoading();

  return (
    <div className="fixed top-4 right-4">
      {globalLoading.isLoading && (
        <div className="bg-black/80 text-white px-4 py-2 rounded-lg">
          {globalLoading.loadingText}
          {operations.size > 1 && (
            <span className="ml-2 text-xs">
              ({operations.size} operations)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

## 🎨 Styling & Customization

### Custom Loading Overlay
```tsx
function CustomLoadingOverlay() {
  const { globalLoading } = useLoading();

  if (!globalLoading.isLoading || !globalLoading.overlay) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          {globalLoading.loadingText}
        </h3>
        {globalLoading.type === 'progress' && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${globalLoading.progress || 0}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

### Custom Skeleton
```tsx
function CustomSkeleton({ className }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-4 bg-gray-300 rounded mb-2" />
      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-300 rounded w-1/2" />
    </div>
  );
}
```

## 🚀 Integration Examples

### React Query Integration
```tsx
function useAgentsWithLoading() {
  const { startLoading, stopLoading } = useLoading();
  
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      startLoading('fetch-agents', { text: 'Loading agents...' });
      try {
        return await api.get('/agents');
      } finally {
        stopLoading('fetch-agents');
      }
    },
  });
}
```

### Form Integration
```tsx
function AgentForm() {
  const { submit, isSubmitting } = useFormSubmission('agent-form');
  
  const handleSubmit = async (data) => {
    await submit(
      () => createAgent(data),
      {
        successMessage: 'Agent created successfully!',
        onSuccess: () => router.push('/agents'),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <LoadingButton
        type="submit"
        isLoading={isSubmitting}
        loadingText="Creating Agent..."
      >
        Create Agent
      </LoadingButton>
    </form>
  );
}
```

The central loading state system provides a consistent, professional UX across the entire Clarifaior application! 🚀
