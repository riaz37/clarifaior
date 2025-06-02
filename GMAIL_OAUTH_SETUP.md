# 📧 Gmail OAuth & Push Notifications Setup

This guide covers setting up Gmail OAuth flows and real-time email triggers for Clarifaior.

## 🎯 What We've Implemented

### **✅ OAuth Flow**
- **User-friendly OAuth**: Click-to-connect Gmail accounts
- **Automatic Token Refresh**: Handles expired tokens automatically
- **Secure Token Storage**: Encrypted tokens in database
- **Multi-workspace Support**: Different Gmail accounts per workspace

### **✅ Gmail Push Notifications**
- **Real-time Triggers**: Instant email notifications via Google Pub/Sub
- **Smart Filtering**: Filter emails by labels, queries, senders
- **Agent Triggering**: Automatically execute agents on new emails
- **History Tracking**: Prevents duplicate processing

## 🚀 Setup Instructions

### **1. Google Cloud Console Setup**

#### **Create Project & Enable APIs**
```bash
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create new project: "Clarifaior Gmail Integration"
3. Enable APIs:
   - Gmail API
   - Cloud Pub/Sub API
   - Google+ API (for user info)
```

#### **Create OAuth Credentials**
```bash
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Clarifaior Gmail OAuth"
5. Authorized redirect URIs:
   - http://localhost:3001/auth/google/callback
   - https://your-domain.com/auth/google/callback (production)
6. Download credentials JSON
```

#### **Set up Pub/Sub for Push Notifications**
```bash
1. Go to "Pub/Sub" in Google Cloud Console
2. Create Topic:
   - Name: "gmail-notifications"
   - Leave other settings as default
3. Create Subscription:
   - Name: "gmail-notifications-sub"
   - Topic: "gmail-notifications"
   - Delivery Type: "Push"
   - Endpoint URL: https://your-domain.com/auth/gmail/webhook
4. Grant Gmail API access to publish to topic:
   - Go to topic "gmail-notifications"
   - Click "Permissions"
   - Add member: gmail-api-push@system.gserviceaccount.com
   - Role: Pub/Sub Publisher
```

### **2. Environment Configuration**

Add to your `apps/server/.env`:

```bash
# Gmail OAuth
GMAIL_CLIENT_ID=123456789-abcdefghijklmnop.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
GMAIL_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Google Cloud Pub/Sub
GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
GMAIL_PUBSUB_TOPIC=gmail-notifications
GMAIL_PUBSUB_SUBSCRIPTION=gmail-notifications-sub

# Service Account (for Pub/Sub)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### **3. Database Migration**

Run the database migration to add OAuth tables:

```bash
cd packages/database
pnpm db:push
```

This adds:
- `oauth_tokens` - Encrypted OAuth tokens
- `gmail_watches` - Gmail watch configurations
- `integration_connections` - User integration connections

## 🧪 Testing OAuth Flow

### **1. Initiate OAuth**
```bash
# Start OAuth flow (redirects to Google)
curl -X GET "http://localhost:3001/auth/google?workspaceId=1" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -L

# User will be redirected to Google OAuth consent screen
# After approval, redirected back to /auth/google/callback
```

### **2. Check Connection Status**
```bash
# Check if user has connected Gmail
curl -X GET "http://localhost:3001/auth/connections?workspaceId=1" \
  -H "Authorization: Bearer <your-jwt-token>"

# Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "provider": "google",
      "connectionName": "Gmail - user@example.com",
      "config": {
        "email": "user@example.com",
        "name": "John Doe"
      },
      "lastUsed": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### **3. Test Token Validity**
```bash
# Check if OAuth token is valid and not expired
curl -X GET "http://localhost:3001/auth/test/gmail-token?workspaceId=1" \
  -H "Authorization: Bearer <your-jwt-token>"

# Response:
{
  "success": true,
  "data": {
    "hasToken": true,
    "expiresAt": "2024-01-15T11:30:00Z",
    "scope": "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
    "hasRefreshToken": true
  }
}
```

## 📬 Setting Up Gmail Push Notifications

### **1. Setup Gmail Watch**
```bash
# Setup Gmail watch for a workspace
curl -X POST http://localhost:3001/auth/gmail/watch \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": 1,
    "agentId": 123,
    "labelIds": ["INBOX"],
    "query": "from:customer@example.com"
  }'

# Response:
{
  "success": true,
  "data": {
    "watchId": 456,
    "emailAddress": "user@example.com",
    "historyId": "12345",
    "expiration": "2024-01-22T10:30:00Z",
    "topicName": "gmail-notifications"
  }
}
```

### **2. Test Push Notification**
```bash
# Send test email to watched address
# Gmail will send push notification to your Pub/Sub topic
# Check logs to see notification processing

# Manual webhook test:
curl -X POST http://localhost:3001/auth/gmail/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "data": "eyJlbWFpbEFkZHJlc3MiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaGlzdG9yeUlkIjoiMTIzNDUifQ==",
      "messageId": "test-message-id",
      "publishTime": "2024-01-15T10:30:00Z"
    },
    "subscription": "projects/your-project/subscriptions/gmail-notifications-sub"
  }'
```

## 🤖 Using OAuth in Agents

### **Agent with Gmail OAuth**
```json
{
  "name": "Personal Email Assistant",
  "flowDefinition": {
    "nodes": [
      {
        "id": "gmail-trigger",
        "type": "trigger_gmail",
        "data": {
          "useOAuth": true,
          "labelIds": ["INBOX"],
          "query": "is:unread"
        }
      },
      {
        "id": "llm-analyze",
        "type": "prompt_llm",
        "data": {
          "prompt": "Analyze this email and categorize it:\n\nFrom: {{trigger.email.from}}\nSubject: {{trigger.email.subject}}\nBody: {{trigger.email.snippet}}\n\nCategories: Work, Personal, Spam, Important",
          "model": "deepseek-chat"
        }
      },
      {
        "id": "gmail-reply",
        "type": "action_email",
        "data": {
          "useOAuth": true,
          "to": "{{trigger.email.from}}",
          "subject": "Re: {{trigger.email.subject}}",
          "body": "Thank you for your email. I've categorized it as: {{llm-analyze.category}}"
        }
      }
    ]
  }
}
```

## 📊 API Endpoints

### **OAuth Management**
```bash
# Initiate OAuth flow
GET /auth/google?workspaceId=1&state=custom-state

# OAuth callback (handled automatically)
GET /auth/google/callback?code=...&state=...

# Get user connections
GET /auth/connections?workspaceId=1

# Revoke OAuth token
DELETE /auth/google/revoke?workspaceId=1

# Test token validity
GET /auth/test/gmail-token?workspaceId=1
```

### **Gmail Push Notifications**
```bash
# Setup Gmail watch
POST /auth/gmail/watch
{
  "workspaceId": 1,
  "agentId": 123,
  "labelIds": ["INBOX", "IMPORTANT"],
  "query": "from:important@company.com"
}

# Stop Gmail watch
DELETE /auth/gmail/watch?workspaceId=1

# Webhook endpoint (for Google Pub/Sub)
POST /auth/gmail/webhook
```

## 🔒 Security Features

### **Token Security**
- **Encryption**: All tokens encrypted before database storage
- **Automatic Refresh**: Expired tokens refreshed automatically
- **Scope Validation**: Only requested permissions granted
- **Revocation**: Users can revoke access anytime

### **Push Notification Security**
- **Pub/Sub Authentication**: Google-signed messages
- **Message Validation**: Verify message authenticity
- **Rate Limiting**: Prevent abuse of webhook endpoint
- **Error Handling**: Graceful failure handling

## 🚨 Troubleshooting

### **Common OAuth Issues**

1. **"Invalid redirect URI"**
   ```bash
   # Ensure redirect URI matches exactly in Google Console
   # Check GMAIL_REDIRECT_URI environment variable
   ```

2. **"Token expired" errors**
   ```bash
   # Check if refresh token is available
   # Re-authenticate if refresh token missing
   ```

3. **"Insufficient permissions"**
   ```bash
   # Verify OAuth scopes include required permissions
   # Re-authenticate with correct scopes
   ```

### **Push Notification Issues**

1. **"No notifications received"**
   ```bash
   # Check Pub/Sub topic permissions
   # Verify Gmail API can publish to topic
   # Check watch expiration time
   ```

2. **"Duplicate processing"**
   ```bash
   # Check lastProcessedHistoryId tracking
   # Verify history ID comparison logic
   ```

## 🎯 Production Considerations

### **Scaling**
- **Multiple Workers**: Scale Pub/Sub subscription processing
- **Rate Limiting**: Implement Gmail API rate limiting
- **Error Recovery**: Retry failed message processing
- **Monitoring**: Track OAuth token health and usage

### **Security**
- **HTTPS Only**: Use HTTPS for OAuth redirects in production
- **Token Rotation**: Regular token refresh and validation
- **Audit Logging**: Log all OAuth and email access
- **Data Privacy**: Comply with email privacy regulations

## ✅ What's Now Working

✅ **Complete OAuth Flow**: User-friendly Gmail connection  
✅ **Automatic Token Refresh**: No manual token management  
✅ **Real-time Email Triggers**: Instant agent execution on new emails  
✅ **Secure Token Storage**: Encrypted tokens in database  
✅ **Multi-workspace Support**: Different Gmail accounts per workspace  
✅ **Smart Filtering**: Advanced email filtering and routing  
✅ **Production Ready**: Scalable Pub/Sub architecture  

Gmail integration is now **fully functional** with OAuth and real-time triggers! 📧✨
