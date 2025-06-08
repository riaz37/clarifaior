// Import agent classes
import { IntentParserAgent } from './intent-parser.agent';
import { BaseAgent } from './base/base-agent';
import { AgentConfig } from './base/agent.interface';

// Re-export types
export * from './base/agent.interface';

// Export agent classes
export { IntentParserAgent } from './intent-parser.agent';

// Export a function to load all agents
export async function loadAllAgents(options: { verbose?: boolean } = {}) {
  // Default configuration for agents
  const defaultConfig: AgentConfig = {
    name: '',
    description: '',
    llmProvider: 'openai',
    temperature: 0.7,
  };

  // Initialize agents with default config
  const agents = [
    new IntentParserAgent(defaultConfig),
    // Add other agents here as they become available
  ];

  if (options.verbose) {
    console.log(`Loaded ${agents.length} agents`);
  }

  return agents;
}

// Export base agent class
export { BaseAgent } from './base/base-agent';
