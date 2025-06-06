import { BaseTemplate, TemplateConfig } from '../base/template.interface';

export class WorkflowCreationTemplate extends BaseTemplate {
  constructor() {
    const config: TemplateConfig = {
      name: 'workflow-creation',
      description: 'Template for creating workflows from natural language descriptions',
      version: '1.0.0',
      variables: [
        {
          name: 'userInput',
          type: 'string',
          required: true,
          description: 'Natural language description of the desired workflow',
        },
        {
          name: 'availableIntegrations',
          type: 'array',
          required: true,
          description: 'List of available integrations and their capabilities',
        },
        {
          name: 'userContext',
          type: 'object',
          required: false,
          description: 'User context including preferences and previous workflows',
        },
        {
          name: 'constraints',
          type: 'object',
          required: false,
          description: 'Any constraints or limitations to consider',
        },
        {
          name: 'examples',
          type: 'array',
          required: false,
          description: 'Similar workflow examples for reference',
        },
      ],
      examples: [
        {
          input: {
            userInput: 'When I receive an email from my boss, send a Slack message to the team channel',
            availableIntegrations: ['gmail', 'slack'],
            userContext: { role: 'manager', team: 'engineering' },
          },
          expectedOutput: 'A workflow with Gmail trigger and Slack action',
        },
      ],
    };

    super(config);
  }

  getTemplate(): string {
    return `
You are an expert workflow designer. Your task is to create a detailed workflow specification based on the user's natural language description.

## User Request
{{userInput}}

## Available Integrations
{{#each availableIntegrations}}
- {{this.name}}: {{this.description}}
  Capabilities: {{#each this.capabilities}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}

{{#if userContext}}
## User Context
- Role: {{userContext.role}}
- Team: {{userContext.team}}
- Preferences: {{userContext.preferences}}
{{/if}}

{{#if constraints}}
## Constraints
{{#each constraints}}
- {{@key}}: {{this}}
{{/each}}
{{/if}}

{{#if examples}}
## Similar Examples
{{#each examples}}
### Example {{@index}}
**Description:** {{this.description}}
**Workflow:** {{this.workflow}}
{{/each}}
{{/if}}

## Instructions
Create a comprehensive workflow specification that includes:

1. **Workflow Name**: A clear, descriptive name
2. **Description**: Brief explanation of what the workflow does
3. **Trigger**: What event starts the workflow
4. **Steps**: Detailed sequence of actions
5. **Conditions**: Any conditional logic needed
6. **Error Handling**: How to handle failures
7. **Confidence**: Your confidence level (0-1) in this design

## Output Format
Respond with a valid JSON object matching this schema:

\`\`\`json
{
  "name": "string",
  "description": "string",
  "trigger": {
    "type": "string",
    "integration": "string",
    "config": {}
  },
  "steps": [
    {
      "id": "string",
      "type": "string",
      "integration": "string",
      "action": "string",
      "parameters": {},
      "conditions": []
    }
  ],
  "errorHandling": {
    "retryPolicy": {},
    "fallbackActions": []
  },
  "explanation": "string",
  "confidence": 0.95
}
\`\`\`

Focus on:
- Using only the available integrations
- Creating logical, efficient workflows
- Including proper error handling
- Providing clear explanations
- Being specific about parameters and configurations
`;
  }
}