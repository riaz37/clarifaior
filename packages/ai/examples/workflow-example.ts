import { ExecutionGraph } from '../src/graphs/execution-graph';

// Define the state interface for our approval workflow
interface ApprovalState {
  input: {
    amount: number;
    requester: string;
    description: string;
  };
  output?: {
    status: 'approved' | 'rejected' | 'escalated';
    approvedBy?: string;
    reason?: string;
  };
  steps: Array<{
    node: string;
    input?: any;
    output?: any;
    duration: number;
    success: boolean;
    error?: Error;
  }>;
  metadata?: {
    approvalLevel: 'manager' | 'director' | 'vp';
    comments: string[];
  };
}

// Create an approval workflow
async function createApprovalWorkflow() {
  // Define the workflow nodes
  const workflow = new ExecutionGraph<ApprovalState, ApprovalState['input'], ApprovalState['output']>({
    entryPoint: 'start',
    outputNode: 'end',
    initialState: {
      metadata: {
        approvalLevel: 'manager',
        comments: [],
      },
    },
    nodes: [
      // Start node - validates the request
      {
        name: 'start',
        description: 'Validate the approval request',
        execute: async (state) => {
          if (!state.input.amount || state.input.amount <= 0) {
            throw new Error('Invalid amount');
          }
          if (!state.input.requester) {
            throw new Error('Requester name is required');
          }
          return state;
        },
        next: () => 'checkApprovalLevel',
      },
      
      // Check approval level based on amount
      {
        name: 'checkApprovalLevel',
        description: 'Determine the required approval level',
        execute: (state) => {
          const { amount } = state.input;
          let approvalLevel: 'manager' | 'director' | 'vp' = 'manager';
          
          if (amount > 10000) {
            approvalLevel = 'vp';
          } else if (amount > 5000) {
            approvalLevel = 'director';
          }
          
          return {
            ...state,
            metadata: {
              ...state.metadata!,
              approvalLevel,
            },
          };
        },
        next: (state) => `approve_${state.metadata!.approvalLevel}` as const,
      },
      
      // Manager approval
      {
        name: 'approve_manager',
        description: 'Manager approval',
        execute: async (state) => {
          // In a real app, this would involve waiting for actual approval
          const approved = Math.random() > 0.3; // 70% chance of approval
          
          return {
            ...state,
            output: {
              status: approved ? 'approved' : 'rejected',
              approvedBy: 'manager@example.com',
              reason: approved ? 'Within budget' : 'Amount too high for manager',
            },
            metadata: {
              ...state.metadata!,
              comments: [...(state.metadata?.comments || []), 'Processed by manager'],
            },
          };
        },
        next: (state) => state.output?.status === 'approved' ? 'end' : 'escalate',
      },
      
      // Director approval
      {
        name: 'approve_director',
        description: 'Director approval',
        execute: async (state) => {
          // Simulate director approval
          const approved = Math.random() > 0.5; // 50% chance of approval
          
          return {
            ...state,
            output: {
              status: approved ? 'approved' : 'rejected',
              approvedBy: 'director@example.com',
              reason: approved ? 'Approved by director' : 'Escalate to VP',
            },
            metadata: {
              ...state.metadata!,
              comments: [...(state.metadata?.comments || []), 'Processed by director'],
            },
          };
        },
        next: (state) => 
          state.output?.status === 'approved' ? 'end' : 
          state.output?.reason?.includes('Escalate') ? 'approve_vp' : 'end',
      },
      
      // VP approval
      {
        name: 'approve_vp',
        description: 'VP approval',
        execute: async (state) => {
          // Simulate VP approval
          const approved = Math.random() > 0.7; // 30% chance of approval
          
          return {
            ...state,
            output: {
              status: approved ? 'approved' : 'rejected',
              approvedBy: 'vp@example.com',
              reason: approved ? 'Approved by VP' : 'Rejected by VP',
            },
            metadata: {
              ...state.metadata!,
              comments: [...(state.metadata?.comments || []), 'Processed by VP'],
            },
          };
        },
        next: () => 'end',
      },
      
      // Escalation handler
      {
        name: 'escalate',
        description: 'Escalate the approval',
        execute: async (state) => {
          const currentLevel = state.metadata?.approvalLevel;
          let nextLevel: 'director' | 'vp' | null = null;
          
          if (currentLevel === 'manager') nextLevel = 'director';
          else if (currentLevel === 'director') nextLevel = 'vp';
          
          return {
            ...state,
            output: {
              status: 'escalated' as const,
              reason: `Escalated to ${nextLevel}`,
            },
            metadata: {
              ...state.metadata!,
              approvalLevel: nextLevel || 'vp',
              comments: [...(state.metadata?.comments || []), `Escalated to ${nextLevel}`],
            },
          };
        },
        next: (state) => `approve_${state.metadata!.approvalLevel}` as const,
      },
      
      // End node
      {
        name: 'end',
        description: 'Workflow completion',
        execute: async (state) => {
          console.log('Workflow completed with state:', JSON.stringify(state, null, 2));
          return state;
        },
      },
    ],
  });
  
  return workflow;
}

// Example usage
async function runExample() {
  try {
    const workflow = await createApprovalWorkflow();
    
    // Example 1: Small amount (manager approval)
    console.log('\n--- Example 1: Small amount (manager approval) ---');
    const result1 = await workflow.execute({
      amount: 1000,
      requester: 'john.doe@example.com',
      description: 'Office supplies',
    });
    console.log('Result 1:', result1);
    
    // Example 2: Medium amount (director approval)
    console.log('\n--- Example 2: Medium amount (director approval) ---');
    const result2 = await workflow.execute({
      amount: 7500,
      requester: 'jane.smith@example.com',
      description: 'Team offsite event',
    });
    console.log('Result 2:', result2);
    
    // Example 3: Large amount (VP approval)
    console.log('\n--- Example 3: Large amount (VP approval) ---');
    const result3 = await workflow.execute({
      amount: 25000,
      requester: 'bob.johnson@example.com',
      description: 'New server hardware',
    });
    console.log('Result 3:', result3);
    
  } catch (error) {
    console.error('Error running workflow example:', error);
  }
}

// Run the example
runExample();
