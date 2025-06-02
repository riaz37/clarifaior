# 🔗 Integration Setup Guide

This guide will help you set up real API integrations for DeepSeek, Slack, and Gmail in Clarifaior.

## 🧠 DeepSeek Setup

### 1. Get DeepSeek API Key
1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key

### 2. Configure Environment
Add to your `.env` file:
```bash
DEEPSEEK_API_KEY=your-deepseek-api-key-here
```

### 3. Test Connection
```bash
curl -X GET http://localhost:3001/api/integrations/test/deepseek \
  -H "Authorization: Bearer <your-jwt-token>"
```

## 💬 Slack Setup

### 1. Create Slack App
1. Go to [Slack API](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "Clarifaior Bot")
4. Select your workspace

### 2. Configure Bot Permissions
1. Go to "OAuth & Permissions"
2. Add these Bot Token Scopes:
   - `chat:write` - Send messages
   - `channels:read` - List public channels
   - `groups:read` - List private channels
   - `users:read` - Read user information
   - `im:write` - Send direct messages

### 3. Install App to Workspace
1. Click "Install to Workspace"
2. Authorize the app
3. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### 4. Configure Environment
Add to your `.env` file:
```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
```

### 5. Test Connection
```bash
curl -X GET http://localhost:3001/api/integrations/test/slack \
  -H "Authorization: Bearer <your-jwt-token>"
```

### 6. Test Sending Message
```bash
curl -X POST http://localhost:3001/api/integrations/test/slack-message \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "#general",
    "message": "Hello from Clarifaior! 🤖"
  }'
```

## 📧 Gmail Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

### 2. Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URI: `http://localhost:3001/auth/gmail/callback`
5. Download the credentials JSON file

### 3. Get Refresh Token
You'll need to implement OAuth flow or use Google's OAuth Playground:

#### Option A: OAuth Playground
1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click settings gear → Check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. In Step 1, select "Gmail API v1" → "https://www.googleapis.com/auth/gmail.modify"
5. Click "Authorize APIs"
6. In Step 2, click "Exchange authorization code for tokens"
7. Copy the refresh token

#### Option B: Implement OAuth Flow (Recommended for production)
```typescript
// Add this route to handle OAuth callback
@Get('auth/gmail/callback')
async gmailCallback(@Query('code') code: string) {
  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  // Store refresh_token securely
}
```

### 4. Configure Environment
Add to your `.env` file:
```bash
GMAIL_CLIENT_ID=your-client-id.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
```

### 5. Test Connection
```bash
curl -X GET http://localhost:3001/api/integrations/test/gmail \
  -H "Authorization: Bearer <your-jwt-token>"
```

### 6. Test Sending Email
```bash
curl -X POST http://localhost:3001/api/integrations/test/email \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test from Clarifaior",
    "body": "This is a test email from Clarifaior! 🚀"
  }'
```

## 🔍 Testing All Integrations

### Check Integration Status
```bash
curl -X GET http://localhost:3001/api/integrations/status \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Test LLM Call
```bash
curl -X POST http://localhost:3001/api/integrations/test/llm \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello! Please respond with a friendly greeting.",
    "model": "deepseek-chat"
  }'
```

### Get Slack Channels
```bash
curl -X GET http://localhost:3001/api/integrations/slack/channels \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Get Gmail Labels
```bash
curl -X GET http://localhost:3001/api/integrations/gmail/labels \
  -H "Authorization: Bearer <your-jwt-token>"
```

## 🚀 Next Steps

1. **Test Agent Execution**: Create an agent with real integrations
2. **Set up Webhooks**: Configure webhook endpoints for triggers
3. **Production Setup**: Use proper OAuth flows and secure credential storage
4. **Monitoring**: Set up logging and error tracking for integrations

## 🔒 Security Notes

- Never commit API keys to version control
- Use environment variables for all credentials
- Implement proper OAuth flows for production
- Rotate API keys regularly
- Monitor API usage and costs

## 📚 API Documentation

- [DeepSeek API Docs](https://platform.deepseek.com/api-docs)
- [Slack API Docs](https://api.slack.com/)
- [Gmail API Docs](https://developers.google.com/gmail/api)
