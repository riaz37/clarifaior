# ClarifAI - AI Orchestration Package

This package provides AI/LLM orchestration capabilities using LangGraph for the ClarifAI platform. It includes integrations with various AI providers (DeepSeek, OpenAI) and services (Gmail, Slack) to enable powerful workflow automation.

## Features

- **LangGraph-based Workflow Orchestration**: Define and execute complex workflows with state management
- **Multi-provider LLM Support**: Integrate with DeepSeek, OpenAI, and other LLM providers
- **Service Integrations**: Built-in tools for Gmail and Slack
- **Extensible Architecture**: Easily add new tools, agents, and workflows
- **TypeScript First**: Fully typed for better developer experience

## Installation

```bash
# Using npm
npm install @clarifai/ai

# Using yarn
yarn add @clarifai/ai
```

## Quick Start

### Initialize the Workflow Orchestrator

```typescript
import { WorkflowOrchestrator } from '@clarifai/ai';

const orchestrator = new WorkflowOrchestrator({
  deepSeekApiKey: 'your-deepseek-api-key',
});

// Create a simple workflow
const workflow = {
  name: 'Email and Notify',
  description: 'Send an email and post to Slack',
  steps: [
    {
      id: 'send-email',
      type: 'gmail',
      action: 'send',
      params: {
        to: 'user@example.com',
        subject: 'Hello from ClarifAI',
        body: 'This is a test email sent from a workflow.'
      }
    },
    {
      id: 'notify-slack',
      type: 'slack',
      action: 'sendMessage',
      params: {
        channel: '#general',
        text: 'Email has been sent to user@example.com'
      },
      dependsOn: ['send-email']
    }
  ]
};

// Execute the workflow
const result = await orchestrator.executeWorkflow(workflow);
console.log('Workflow execution result:', result);
```

### Using Gmail Tools

```typescript
import { createGmailTools } from '@clarifai/ai/tools/gmail-tools';

const gmailTools = createGmailTools({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'your-redirect-uri',
  refreshToken: 'your-refresh-token',
});

// Send an email
const sendResult = await gmailTools[0].invoke({
  to: 'recipient@example.com',
  subject: 'Test Email',
  body: 'This is a test email sent from ClarifAI.'
});

// Search for emails
const searchResult = await gmailTools[1].invoke({
  query: 'from:sender@example.com',
  maxResults: 5
});
```

### Using Slack Tools

```typescript
import { createSlackTools } from '@clarifai/ai/tools/slack-tools';

const slackTools = createSlackTools({
  token: 'your-slack-token',
  defaultChannel: '#general'
});

// Send a message
const messageResult = await slackTools[0].invoke({
  channel: '#random',
  text: 'Hello from ClarifAI!'
});

// Get thread messages
const threadResult = await slackTools[1].invoke({
  channel: 'C1234567890',
  thread_ts: '1234567890.123456'
});
```

## Architecture

The package is organized into the following main components:

- **Agents**: Specialized AI agents for different tasks (workflow design, intent parsing, etc.)
- **Graphs**: LangGraph workflow definitions for different processes
- **State**: State management for workflows and conversations
- **Tools**: Integration tools for external services
- **Providers**: LLM provider implementations (DeepSeek, OpenAI, etc.)
- **Orchestrator**: Main workflow orchestration logic

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
