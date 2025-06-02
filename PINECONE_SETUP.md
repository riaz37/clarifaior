# 🧠 Pinecone Vector Database Setup Guide

This guide covers setting up Pinecone for vector memory search in Clarifaior agents.

## 🎯 What is Pinecone?

Pinecone is a **vector database** that enables:
- **Semantic Search**: Find similar content based on meaning, not just keywords
- **Memory for AI Agents**: Store and retrieve context from previous conversations
- **RAG (Retrieval Augmented Generation)**: Enhance LLM responses with relevant context
- **Document Search**: Find relevant documents based on content similarity

## 🚀 Getting Started with Pinecone

### **1. Create Pinecone Account**
1. Visit [Pinecone.io](https://www.pinecone.io/)
2. Sign up for a free account
3. Verify your email address
4. Complete the onboarding

### **2. Get API Key**
1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Navigate to "API Keys" in the sidebar
3. Copy your API key (starts with `pc-`)

### **3. Create an Index**
1. In Pinecone Console, click "Create Index"
2. **Index Name**: `clarifaior-memory`
3. **Dimensions**: `1536` (for OpenAI embeddings)
4. **Metric**: `cosine`
5. **Cloud Provider**: `AWS`
6. **Region**: `us-east-1` (or closest to you)
7. Click "Create Index"

### **4. Configure Environment Variables**
Add to your `apps/server/.env` file:

```bash
# Pinecone Configuration
PINECONE_API_KEY=pc-your-pinecone-api-key-here
PINECONE_INDEX_NAME=clarifaior-memory

# Required for embeddings (if using OpenAI)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## 🧪 Testing Pinecone Integration

### **1. Test Connection**
```bash
curl -X GET http://localhost:3001/api/integrations/test/pinecone \
  -H "Authorization: Bearer <your-jwt-token>"

# Expected Response:
{
  "success": true,
  "data": {
    "service": "Pinecone",
    "connected": true,
    "message": "Connection successful"
  }
}
```

### **2. Check Index Stats**
```bash
curl -X GET http://localhost:3001/api/integrations/pinecone/stats \
  -H "Authorization: Bearer <your-jwt-token>"

# Expected Response:
{
  "success": true,
  "data": {
    "indexName": "clarifaior-memory",
    "dimension": 1536,
    "indexFullness": 0.0,
    "totalVectorCount": 0,
    "namespaces": {}
  }
}
```

### **3. Store Test Memory**
```bash
curl -X POST http://localhost:3001/api/integrations/pinecone/store \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-memory-1",
    "content": "The user prefers to receive notifications via email rather than SMS.",
    "metadata": {
      "type": "user_preference",
      "userId": "123",
      "category": "notifications"
    }
  }'

# Expected Response:
{
  "success": true,
  "data": {
    "id": "test-memory-1",
    "stored": true
  },
  "message": "Memory stored successfully"
}
```

### **4. Search Memory**
```bash
curl -X POST http://localhost:3001/api/integrations/test/memory-search \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How does the user want to be contacted?",
    "topK": 5,
    "threshold": 0.7
  }'

# Expected Response:
{
  "success": true,
  "data": [
    {
      "id": "test-memory-1",
      "score": 0.89,
      "content": "The user prefers to receive notifications via email rather than SMS.",
      "metadata": {
        "type": "user_preference",
        "userId": "123",
        "category": "notifications",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    }
  ]
}
```

## 🤖 Using Memory in Agents

### **Memory Search Node**
Add a memory search node to your agent flow:

```json
{
  "id": "memory-search",
  "type": "prompt_memory",
  "data": {
    "query": "{{trigger.email.subject}} {{trigger.email.body}}",
    "topK": 3,
    "threshold": 0.8
  }
}
```

### **Example Agent with Memory**
```json
{
  "name": "Customer Support with Memory",
  "flowDefinition": {
    "nodes": [
      {
        "id": "email-trigger",
        "type": "trigger_gmail",
        "data": {
          "filter": "to:support@company.com"
        }
      },
      {
        "id": "search-memory",
        "type": "prompt_memory",
        "data": {
          "query": "Customer: {{trigger.email.from}} Issue: {{trigger.email.subject}}",
          "topK": 5,
          "threshold": 0.7
        }
      },
      {
        "id": "llm-response",
        "type": "prompt_llm",
        "data": {
          "prompt": "Customer Email:\nFrom: {{trigger.email.from}}\nSubject: {{trigger.email.subject}}\nBody: {{trigger.email.body}}\n\nPrevious Context:\n{{search-memory.results}}\n\nProvide a helpful response based on the email and previous context.",
          "model": "deepseek-chat"
        }
      },
      {
        "id": "send-reply",
        "type": "action_email",
        "data": {
          "to": "{{trigger.email.from}}",
          "subject": "Re: {{trigger.email.subject}}",
          "body": "{{llm-response.response}}"
        }
      }
    ],
    "edges": [
      {"source": "email-trigger", "target": "search-memory"},
      {"source": "search-memory", "target": "llm-response"},
      {"source": "llm-response", "target": "send-reply"}
    ]
  }
}
```

## 📊 API Endpoints

### **Memory Management**
```bash
# Test connection
GET /api/integrations/test/pinecone

# Get index statistics
GET /api/integrations/pinecone/stats

# Store memory
POST /api/integrations/pinecone/store
{
  "id": "unique-id",
  "content": "text to store",
  "metadata": {"key": "value"}
}

# Search memory
POST /api/integrations/test/memory-search
{
  "query": "search query",
  "topK": 5,
  "threshold": 0.7
}

# Delete memory
DELETE /api/integrations/pinecone/memory/:id
```

### **Integration Status**
```bash
# Check all integrations including Pinecone
GET /api/integrations/status
```

## 🔧 Advanced Configuration

### **Custom Embedding Models**
By default, we use OpenAI's `text-embedding-ada-002`. You can modify the embedding generation in `PineconeService`:

```typescript
// In pinecone.service.ts
private async generateEmbedding(text: string): Promise<number[]> {
  // Option 1: OpenAI (default)
  // Option 2: Hugging Face
  // Option 3: Cohere
  // Option 4: Local models
}
```

### **Index Management**
```bash
# Create index programmatically (if needed)
curl -X POST http://localhost:3001/api/integrations/pinecone/create-index \
  -H "Authorization: Bearer <token>" \
  -d '{"dimension": 1536}'
```

### **Batch Operations**
For storing multiple memories at once, you can extend the service:

```typescript
async storeBatchMemories(documents: MemoryDocument[]): Promise<void> {
  // Batch upsert implementation
}
```

## 💡 Use Cases

### **1. Customer Support Memory**
- Store customer preferences, past issues, solutions
- Search for similar problems and their resolutions
- Maintain context across multiple interactions

### **2. Knowledge Base**
- Store company documentation, FAQs, procedures
- Enable semantic search across all documents
- Provide relevant context to AI responses

### **3. Personal Assistant**
- Remember user preferences, habits, important dates
- Store conversation history and context
- Provide personalized responses based on past interactions

### **4. Content Recommendation**
- Store user interests, past content interactions
- Find similar content based on user behavior
- Recommend relevant articles, products, or services

## 🚨 Troubleshooting

### **Common Issues**

1. **"Index not found" Error**
   ```bash
   # Check if index exists in Pinecone Console
   # Verify PINECONE_INDEX_NAME matches exactly
   ```

2. **"Invalid API Key" Error**
   ```bash
   # Verify PINECONE_API_KEY is correct
   # Check API key permissions in Pinecone Console
   ```

3. **"Dimension Mismatch" Error**
   ```bash
   # Ensure embedding dimension matches index dimension
   # OpenAI ada-002: 1536 dimensions
   # Recreate index with correct dimensions if needed
   ```

4. **"Embedding Generation Failed"**
   ```bash
   # Verify OPENAI_API_KEY is set
   # Check OpenAI API quota and billing
   ```

### **Debug Commands**
```bash
# Check integration status
curl -X GET http://localhost:3001/api/integrations/status

# Test individual components
curl -X GET http://localhost:3001/api/integrations/test/pinecone
```

## 🎯 Next Steps

1. **Set up your Pinecone account and index**
2. **Configure environment variables**
3. **Test the integration with sample data**
4. **Create agents that use memory search**
5. **Monitor usage and optimize performance**

With Pinecone integrated, your AI agents now have **persistent memory** and can provide **contextually aware responses** based on previous interactions and stored knowledge! 🧠✨
