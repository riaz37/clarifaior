# 🚀 Week 3: Webhooks, Scheduler & Notion Integration

This guide covers the implementation of dynamic webhooks, cron-based scheduling, and complete Notion integration.

## 🔗 Webhook System

### Features Implemented
- **Dynamic Webhook Generation**: Unique endpoints for each agent
- **Webhook Authentication**: HMAC signature validation
- **Trigger Execution**: Automatic agent execution from webhooks
- **Webhook Logging**: Detailed request/response logging
- **Management API**: Full CRUD operations for webhooks

### API Endpoints

#### Webhook Management
```bash
# Create webhook for agent
POST /api/agents/:agentId/webhooks
{
  "name": "Customer Support Webhook",
  "config": {
    "description": "Handles customer support emails"
  }
}

# Get agent webhooks
GET /api/agents/:agentId/webhooks

# Get webhook details
GET /api/webhooks/:webhookId

# Delete webhook
DELETE /api/webhooks/:webhookId

# Get webhook logs
GET /api/webhooks/:webhookId/logs?limit=50

# Test webhook
POST /api/webhooks/:webhookId/test
{
  "customer": "John Doe",
  "issue": "Billing question"
}
```

#### Public Webhook Trigger
```bash
# Any HTTP method supported
POST https://your-domain.com/webhooks/abc123def456
{
  "event": "customer_email",
  "data": {
    "from": "customer@example.com",
    "subject": "Need help with billing",
    "body": "I have a question about my invoice..."
  }
}
```

### Webhook Security
- **HMAC Validation**: Optional signature verification
- **IP Filtering**: Can be configured per webhook
- **Rate Limiting**: Built-in protection against abuse
- **Logging**: All requests logged for audit

### Example Usage
```typescript
// 1. Create webhook
const webhook = await fetch('/api/agents/123/webhooks', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' },
  body: JSON.stringify({
    name: 'Slack Bot Webhook',
    config: { source: 'slack' }
  })
});

// 2. Use webhook URL in external service
const webhookUrl = webhook.url; // https://domain.com/webhooks/abc123

// 3. External service calls webhook
// Agent automatically executes with trigger data
```

## ⏰ Scheduler System

### Features Implemented
- **Cron-based Scheduling**: Full cron expression support
- **Timezone Support**: Schedule in any timezone
- **Recurring Execution**: Automatic recurring agent runs
- **Schedule Management**: Enable/disable, update schedules
- **Conflict Resolution**: Prevents overlapping executions

### API Endpoints

#### Schedule Management
```bash
# Create schedule for agent
POST /api/agents/:agentId/schedules
{
  "name": "Daily Report Generator",
  "cronExpression": "0 9 * * 1-5",
  "timezone": "America/New_York",
  "config": {
    "reportType": "daily_summary"
  }
}

# Get agent schedules
GET /api/agents/:agentId/schedules

# Update schedule
PUT /api/schedules/:scheduleId
{
  "cronExpression": "0 8 * * 1-5",
  "timezone": "America/Los_Angeles"
}

# Toggle schedule on/off
PUT /api/schedules/:scheduleId/toggle
{
  "isActive": false
}

# Delete schedule
DELETE /api/schedules/:scheduleId

# Get timezone list
GET /api/schedules/timezones

# Get cron presets
GET /api/schedules/cron-presets
```

### Cron Expression Examples
```bash
# Every minute
"* * * * *"

# Every 15 minutes
"*/15 * * * *"

# Daily at 9 AM
"0 9 * * *"

# Weekdays at 9 AM
"0 9 * * 1-5"

# First day of month at midnight
"0 0 1 * *"

# Every Monday at 10 AM
"0 10 * * 1"
```

### Timezone Support
- **50+ Timezones**: Major world timezones supported
- **DST Handling**: Automatic daylight saving time adjustments
- **UTC Default**: Falls back to UTC if timezone invalid

### Example Usage
```typescript
// 1. Create daily report schedule
const schedule = await fetch('/api/agents/123/schedules', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Daily Sales Report',
    cronExpression: '0 9 * * 1-5', // 9 AM weekdays
    timezone: 'America/New_York'
  })
});

// 2. Agent runs automatically every weekday at 9 AM EST
// 3. Execution logs show scheduled trigger type
```

## 📝 Complete Notion Integration

### Features Implemented
- **Real Notion API**: Full Notion API client integration
- **Database Operations**: Create pages, query databases
- **Property Mapping**: Automatic property type handling
- **OAuth Ready**: Prepared for OAuth flow implementation
- **Error Handling**: Comprehensive error messages

### Environment Setup
```bash
# Add to .env
NOTION_TOKEN=secret_your-notion-integration-token
```

### Getting Notion Token
1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name your integration (e.g., "Clarifaior")
4. Select workspace
5. Copy the "Internal Integration Token"
6. Share databases with your integration

### API Endpoints

#### Notion Testing
```bash
# Test connection
GET /api/integrations/test/notion

# Get available databases
GET /api/integrations/notion/databases

# Get database properties
GET /api/integrations/notion/databases/:databaseId/properties

# Test page creation
POST /api/integrations/test/notion-page
{
  "database": "database-id-here",
  "title": "Test Page from Clarifaior",
  "properties": {
    "Status": "In Progress",
    "Priority": "High",
    "Tags": ["automation", "test"]
  }
}
```

### Property Type Support
- **Title**: Text titles
- **Rich Text**: Formatted text
- **Number**: Numeric values
- **Checkbox**: Boolean values
- **Select**: Single selection
- **Multi-select**: Multiple selections
- **Date**: Date values
- **URL**: Web links
- **Email**: Email addresses

### Example Agent Flow
```json
{
  "nodes": [
    {
      "id": "gmail-trigger",
      "type": "trigger_gmail",
      "data": {
        "filter": "to:support@company.com"
      }
    },
    {
      "id": "llm-categorize",
      "type": "prompt_llm",
      "data": {
        "prompt": "Categorize this support email:\n\nSubject: {{trigger.email.subject}}\nBody: {{trigger.email.body}}\n\nReturn: Priority (High/Medium/Low) and Category (Bug/Feature/Question)",
        "model": "deepseek-chat"
      }
    },
    {
      "id": "notion-create",
      "type": "action_notion",
      "data": {
        "database": "your-database-id",
        "title": "Support: {{trigger.email.subject}}",
        "properties": {
          "Customer Email": "{{trigger.email.from}}",
          "Priority": "{{llm-categorize.priority}}",
          "Category": "{{llm-categorize.category}}",
          "Status": "New",
          "Created Date": "{{trigger.timestamp}}"
        }
      }
    }
  ]
}
```

## 🧪 Testing Everything

### 1. Test Webhook System
```bash
# Create webhook
curl -X POST http://localhost:3001/api/agents/1/webhooks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Webhook"}'

# Trigger webhook
curl -X POST http://localhost:3001/webhooks/abc123 \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 2. Test Scheduler
```bash
# Create schedule (every minute for testing)
curl -X POST http://localhost:3001/api/agents/1/schedules \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Schedule",
    "cronExpression": "* * * * *",
    "timezone": "UTC"
  }'
```

### 3. Test Notion Integration
```bash
# Test connection
curl -X GET http://localhost:3001/api/integrations/test/notion \
  -H "Authorization: Bearer <token>"

# Create test page
curl -X POST http://localhost:3001/api/integrations/test/notion-page \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "database": "your-database-id",
    "title": "Test from Clarifaior",
    "properties": {
      "Status": "Testing"
    }
  }'
```

## 🔄 Complete Agent Example

Here's a complete agent that uses all three systems:

```json
{
  "name": "Customer Support Automation",
  "description": "Handles customer emails, creates Notion tickets, sends Slack notifications",
  "flowDefinition": {
    "nodes": [
      {
        "id": "webhook-trigger",
        "type": "trigger_webhook",
        "data": {
          "description": "Receives customer support requests"
        }
      },
      {
        "id": "llm-analyze",
        "type": "prompt_llm",
        "data": {
          "prompt": "Analyze this customer request:\n\nCustomer: {{trigger.webhook.body.customer}}\nIssue: {{trigger.webhook.body.issue}}\nDetails: {{trigger.webhook.body.details}}\n\nProvide:\n1. Priority (High/Medium/Low)\n2. Category (Bug/Feature/Question/Billing)\n3. Suggested response",
          "model": "deepseek-chat"
        }
      },
      {
        "id": "notion-ticket",
        "type": "action_notion",
        "data": {
          "database": "support-tickets-db-id",
          "title": "{{trigger.webhook.body.customer}} - {{trigger.webhook.body.issue}}",
          "properties": {
            "Customer": "{{trigger.webhook.body.customer}}",
            "Priority": "{{llm-analyze.priority}}",
            "Category": "{{llm-analyze.category}}",
            "Status": "New",
            "Details": "{{trigger.webhook.body.details}}"
          }
        }
      },
      {
        "id": "slack-notify",
        "type": "action_slack",
        "data": {
          "channel": "#customer-support",
          "message": "🎫 New {{llm-analyze.priority}} priority ticket:\n\n**Customer:** {{trigger.webhook.body.customer}}\n**Issue:** {{trigger.webhook.body.issue}}\n**Category:** {{llm-analyze.category}}\n\n**Notion Ticket:** {{notion-ticket.url}}\n\n**Suggested Response:**\n{{llm-analyze.response}}"
        }
      }
    ],
    "edges": [
      {"source": "webhook-trigger", "target": "llm-analyze"},
      {"source": "llm-analyze", "target": "notion-ticket"},
      {"source": "notion-ticket", "target": "slack-notify"}
    ]
  },
  "triggers": {
    "webhook": {
      "name": "Customer Support Webhook",
      "url": "https://your-domain.com/webhooks/abc123"
    },
    "schedule": {
      "name": "Daily Summary",
      "cron": "0 17 * * 1-5",
      "timezone": "America/New_York"
    }
  }
}
```

## 🎯 What's Working Now

✅ **Dynamic Webhooks**: Create unique endpoints for any agent
✅ **Webhook Security**: HMAC validation and request logging
✅ **Cron Scheduling**: Full cron expression support with timezones
✅ **Schedule Management**: Enable/disable, update schedules
✅ **Real Notion API**: Create pages, query databases
✅ **Property Mapping**: Automatic Notion property type handling
✅ **Pinecone Vector DB**: Real vector memory search with embeddings
✅ **Memory Search**: Semantic search across stored knowledge
✅ **Complete Integration**: All systems work together seamlessly

## 🚀 Next Steps

1. **Frontend UI**: Build webhook and schedule management interfaces
2. **OAuth Flows**: Implement proper OAuth for Notion and other services
3. **Advanced Scheduling**: Add schedule templates and conflict resolution
4. **Webhook Templates**: Pre-built webhook configurations
5. **Monitoring**: Webhook and schedule execution dashboards

## 🧠 Pinecone Vector Database

### **Memory Search Integration**
- **Real Vector Search**: Semantic similarity search using embeddings
- **Knowledge Storage**: Store and retrieve contextual information
- **RAG Support**: Retrieval Augmented Generation for better AI responses
- **Persistent Memory**: Agents remember past interactions and context

### **API Endpoints**
```bash
# Test Pinecone connection
GET /api/integrations/test/pinecone

# Get index statistics
GET /api/integrations/pinecone/stats

# Store memory
POST /api/integrations/pinecone/store
{
  "id": "memory-1",
  "content": "User prefers email notifications",
  "metadata": {"type": "preference", "userId": "123"}
}

# Search memory
POST /api/integrations/test/memory-search
{
  "query": "How does user want to be contacted?",
  "topK": 5,
  "threshold": 0.7
}

# Delete memory
DELETE /api/integrations/pinecone/memory/:id
```

### **Environment Setup**
```bash
# Required for Pinecone
PINECONE_API_KEY=pc-your-pinecone-api-key
PINECONE_INDEX_NAME=clarifaior-memory

# Required for embeddings
OPENAI_API_KEY=sk-your-openai-api-key
```

### **Example Agent with Memory**
```json
{
  "nodes": [
    {
      "id": "memory-search",
      "type": "prompt_memory",
      "data": {
        "query": "{{trigger.email.subject}} {{trigger.email.body}}",
        "topK": 3,
        "threshold": 0.8
      }
    },
    {
      "id": "llm-with-context",
      "type": "prompt_llm",
      "data": {
        "prompt": "Email: {{trigger.email.body}}\n\nRelevant Context:\n{{memory-search.results}}\n\nProvide a response using the context.",
        "model": "deepseek-chat"
      }
    }
  ]
}
```

Week 3 implementation is complete! 🎉
