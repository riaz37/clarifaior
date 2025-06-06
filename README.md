# 🤖 Clarifaior

A no-code IDE for building AI agents that automate workflows using natural language, triggers, and API actions — all powered by LLMs.

## 🚀 Features

- **Visual Agent Builder**: Drag-and-drop interface powered by React Flow
- **LLM Integration**: LangChain-powered prompt nodes with memory and tools
- **Trigger System**: Gmail, Slack, webhook, and scheduler triggers
- **Action Integrations**: Slack, Notion, email, and custom webhook actions
- **Execution Engine**: Redis queue-based workflow orchestration
- **Observability**: Langfuse and LangSmith integration for debugging
- **Multi-tenant**: Workspace management with RBAC

## 🛠 Technologies

- **Frontend**: Next.js 15, React Flow, TailwindCSS
- **Backend**: NestJS, Redis, Bull Queue
- **Database**: PostgreSQL with Drizzle ORM
- **AI/ML**: LangChain, Pinecone, OpenAI
- **Integrations**: Gmail API, Slack API, Notion API
- **Observability**: Langfuse, LangSmith
- **Package Manager**: pnpm
- **Monorepo**: Turborepo

---

## 📦 Project Structure

```
clarifaior/
├── apps/
│   ├── web/                          # Next.js 15 Frontend Application
│   │   ├── src/
│   │   │   ├── app/                  # App Router
│   │   │   │   ├── (auth)/           # Auth group routes
│   │   │   │   │   ├── login/
│   │   │   │   │   ├── register/
│   │   │   │   │   └── reset-password/
│   │   │   │   ├── (dashboard)/      # Protected dashboard routes
│   │   │   │   │   ├── workflows/
│   │   │   │   │   ├── agents/
│   │   │   │   │   ├── integrations/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   ├── settings/
│   │   │   │   │   └── billing/
│   │   │   │   ├── (public)/         # Public pages
│   │   │   │   │   ├── pricing/
│   │   │   │   │   ├── docs/
│   │   │   │   │   └── blog/
│   │   │   │   ├── api/              # API routes for Next.js
│   │   │   │   │   ├── auth/
│   │   │   │   │   ├── webhooks/
│   │   │   │   │   └── integrations/
│   │   │   │   └── globals.css
│   │   │   ├── components/           # React components
│   │   │   │   ├── ui/              # Shadcn/ui components
│   │   │   │   ├── forms/           # Form components
│   │   │   │   ├── workflow/        # Workflow builder components
│   │   │   │   ├── agents/          # Agent builder components
│   │   │   │   ├── chat/            # Natural language interface
│   │   │   │   ├── analytics/       # Dashboard & analytics
│   │   │   │   └── layout/          # Layout components
│   │   │   ├── lib/                 # Utility functions
│   │   │   │   ├── auth.ts
│   │   │   │   ├── api.ts
│   │   │   │   ├── utils.ts
│   │   │   │   └── validations.ts
│   │   │   ├── hooks/               # Custom React hooks
│   │   │   ├── store/               # Zustand/Redux store
│   │   │   └── types/               # TypeScript definitions
│   │   ├── public/
│   │   ├── tailwind.config.js
│   │   └── next.config.js
│   │
│   ├── server/                       # NestJS Backend (Enhanced)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/            # Authentication & Authorization
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── guards/
│   │   │   │   │   ├── strategies/  # JWT, OAuth strategies
│   │   │   │   │   └── decorators/
│   │   │   │   ├── users/           # User management
│   │   │   │   ├── workspaces/      # Multi-tenant workspaces
│   │   │   │   ├── workflows/       # Workflow management
│   │   │   │   │   ├── workflow.service.ts
│   │   │   │   │   ├── workflow.controller.ts
│   │   │   │   │   ├── workflow-executor.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── agents/          # AI Agent management
│   │   │   │   │   ├── agent.service.ts
│   │   │   │   │   ├── agent-runner.service.ts
│   │   │   │   │   └── nlp/         # Natural language processing
│   │   │   │   ├── integrations/    # Third-party integrations
│   │   │   │   │   ├── base/        # Base integration classes
│   │   │   │   │   ├── slack/
│   │   │   │   │   ├── gmail/
│   │   │   │   │   ├── notion/
│   │   │   │   │   ├── discord/
│   │   │   │   │   ├── trello/
│   │   │   │   │   ├── shopify/
│   │   │   │   │   └── webhooks/
│   │   │   │   ├── triggers/        # Event triggers
│   │   │   │   │   ├── scheduler/
│   │   │   │   │   ├── webhook/
│   │   │   │   │   ├── email/
│   │   │   │   │   └── api-polling/
│   │   │   │   ├── billing/         # Subscription & billing
│   │   │   │   │   ├── billing.service.ts
│   │   │   │   │   ├── stripe.service.ts
│   │   │   │   │   └── usage-tracking.service.ts
│   │   │   │   ├── analytics/       # Usage analytics
│   │   │   │   ├── notifications/   # In-app notifications
│   │   │   │   ├── audit/          # Audit logging
│   │   │   │   └── health/         # Health checks
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/        # Exception filters
│   │   │   │   ├── guards/         # Authorization guards
│   │   │   │   ├── interceptors/   # Request/response interceptors
│   │   │   │   ├── pipes/          # Validation pipes
│   │   │   │   └── middleware/     # Custom middleware
│   │   │   ├── config/
│   │   │   │   ├── database.config.ts
│   │   │   │   ├── redis.config.ts
│   │   │   │   ├── auth.config.ts
│   │   │   │   └── app.config.ts
│   │   │   └── types/              # Shared TypeScript types
│   │   ├── test/                   # E2E tests
│   │   └── Dockerfile
│   │
│   ├── mobile/                      # React Native App (Future)
│   │   ├── src/
│   │   ├── android/
│   │   ├── ios/
│   │   └── package.json
│   │
│   └── docs/                        # Documentation site (Docusaurus/Nextra)
│       ├── docs/
│       ├── blog/
│       └── src/
│
├── packages/
│   ├── database/                    # Enhanced Database Package
│   │   ├── src/
│   │   │   ├── schema/             # Drizzle schema definitions
│   │   │   │   ├── users.ts
│   │   │   │   ├── workspaces.ts
│   │   │   │   ├── workflows.ts
│   │   │   │   ├── agents.ts
│   │   │   │   ├── integrations.ts
│   │   │   │   ├── executions.ts
│   │   │   │   ├── billing.ts
│   │   │   │   ├── audit-logs.ts
│   │   │   │   └── index.ts
│   │   │   ├── migrations/         # Database migrations
│   │   │   ├── seeds/              # Seed data
│   │   │   └── utils/              # Database utilities
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── ui/                         # Shared UI Component Library
│   │   ├── src/
│   │   │   ├── components/         # Reusable components
│   │   │   │   ├── forms/
│   │   │   │   ├── data-display/
│   │   │   │   ├── feedback/
│   │   │   │   ├── navigation/
│   │   │   │   └── layout/
│   │   │   ├── hooks/              # Shared hooks
│   │   │   ├── utils/              # Utility functions
│   │   │   └── styles/             # Shared styles
│   │   ├── tailwind.config.js
│   │   └── package.json
│   │
│   ├── shared/                     # Shared utilities and types
│   │   ├── src/
│   │   │   ├── types/              # Shared TypeScript types
│   │   │   │   ├── workflow.ts
│   │   │   │   ├── agent.ts
│   │   │   │   ├── integration.ts
│   │   │   │   └── user.ts
│   │   │   ├── constants/          # Shared constants
│   │   │   ├── utils/              # Shared utility functions
│   │   │   └── validators/         # Shared validation schemas
│   │   └── package.json
│   │
│   ├── integrations/               # Integration SDK
│   │   ├── src/
│   │   │   ├── base/              # Base integration classes
│   │   │   ├── providers/         # Integration providers
│   │   │   └── types/             # Integration types
│   │   └── package.json
│   │
│   ├── ai/                        # AI/LLM Package with LangGraph
│   │   ├── src/
│   │   │   ├── index.ts                     # Main exports
│   │   │   ├── config/                      # AI configuration
│   │   │   │   ├── llm.config.ts
│   │   │   │   ├── embedding.config.ts
│   │   │   │   └── memory.config.ts
│   │   │   ├── providers/                   # LLM providers
│   │   │   │   ├── base.provider.ts
│   │   │   │   ├── openai.provider.ts
│   │   │   │   ├── anthropic.provider.ts
│   │   │   │   ├── google.provider.ts
│   │   │   │   ├── azure-openai.provider.ts
│   │   │   │   └── provider.factory.ts
│   │   │   ├── agents/                      # Specialized AI agents
│   │   │   │   ├── base/
│   │   │   │   │   ├── base-agent.ts
│   │   │   │   │   └── agent.interface.ts
│   │   │   │   ├── workflow-designer.agent.ts
│   │   │   │   ├── intent-parser.agent.ts
│   │   │   │   ├── integration-mapper.agent.ts
│   │   │   │   ├── validator.agent.ts
│   │   │   │   ├── execution-planner.agent.ts
│   │   │   │   ├── optimizer.agent.ts
│   │   │   │   ├── debugger.agent.ts
│   │   │   │   └── explainer.agent.ts
│   │   │   ├── graphs/                      # LangGraph workflow definitions
│   │   │   │   ├── base/
│   │   │   │   │   ├── base-graph.ts
│   │   │   │   │   └── graph.interface.ts
│   │   │   │   ├── workflow-creation.graph.ts
│   │   │   │   ├── execution.graph.ts
│   │   │   │   ├── debugging.graph.ts
│   │   │   │   ├── optimization.graph.ts
│   │   │   │   ├── validation.graph.ts
│   │   │   │   └── conversation.graph.ts
│   │   │   ├── state/                       # LangGraph state management
│   │   │   │   ├── base/
│   │   │   │   │   ├── base-state.ts
│   │   │   │   │   └── state.interface.ts
│   │   │   │   ├── workflow-state.ts
│   │   │   │   ├── conversation-state.ts
│   │   │   │   ├── execution-state.ts
│   │   │   │   ├── validation-state.ts
│   │   │   │   └── optimization-state.ts
│   │   │   ├── tools/                       # LangChain tools
│   │   │   │   ├── base/
│   │   │   │   │   ├── base-tool.ts
│   │   │   │   │   └── tool.interface.ts
│   │   │   │   ├── integration/
│   │   │   │   │   ├── slack-tools.ts
│   │   │   │   │   ├── gmail-tools.ts
│   │   │   │   │   ├── notion-tools.ts
│   │   │   │   │   ├── discord-tools.ts
│   │   │   │   │   └── generic-api-tool.ts
│   │   │   │   ├── validation/
│   │   │   │   │   ├── workflow-validator.tool.ts
│   │   │   │   │   ├── security-validator.tool.ts
│   │   │   │   │   └── integration-validator.tool.ts
│   │   │   │   ├── execution/
│   │   │   │   │   ├── step-executor.tool.ts
│   │   │   │   │   ├── condition-evaluator.tool.ts
│   │   │   │   │   └── data-transformer.tool.ts
│   │   │   │   └── utility/
│   │   │   │       ├── code-generator.tool.ts
│   │   │   │       ├── schema-generator.tool.ts
│   │   │   │       └── test-generator.tool.ts
│   │   │   ├── parsers/                     # Input/output parsers
│   │   │   │   ├── base/
│   │   │   │   │   └── base-parser.ts
│   │   │   │   ├── intent-parser.ts
│   │   │   │   ├── entity-extractor.ts
│   │   │   │   ├── workflow-parser.ts
│   │   │   │   ├── integration-parser.ts
│   │   │   │   └── condition-parser.ts
│   │   │   ├── templates/                   # Prompt templates
│   │   │   │   ├── base/
│   │   │   │   │   ├── base-template.ts
│   │   │   │   │   └── template.interface.ts
│   │   │   │   ├── workflow/
│   │   │   │   │   ├── workflow-creation.template.ts
│   │   │   │   │   ├── workflow-refinement.template.ts
│   │   │   │   │   ├── workflow-explanation.template.ts
│   │   │   │   │   └── workflow-optimization.template.ts
│   │   │   │   ├── intent/
│   │   │   │   │   ├── intent-classification.template.ts
│   │   │   │   │   ├── entity-extraction.template.ts
│   │   │   │   │   └── context-analysis.template.ts
│   │   │   │   ├── validation/
│   │   │   │   │   ├── workflow-validation.template.ts
│   │   │   │   │   ├── security-check.template.ts
│   │   │   │   │   └── integration-check.template.ts
│   │   │   │   └── execution/
│   │   │   │       ├── step-planning.template.ts
│   │   │   │       ├── error-handling.template.ts
│   │   │   │       └── optimization.template.ts
│   │   │   ├── memory/                      # Memory implementations
│   │   │   │   ├── base/
│   │   │   │   │   ├── base-memory.ts
│   │   │   │   │   └── memory.interface.ts
│   │   │   │   ├── conversation-memory.ts
│   │   │   │   ├── workflow-memory.ts
│   │   │   │   ├── user-memory.ts
│   │   │   │   ├── context-memory.ts
│   │   │   │   └── vector-memory.ts
│   │   │   ├── orchestrator/                # Main orchestration layer
│   │   │   │   ├── ai-orchestrator.ts
│   │   │   │   ├── graph-executor.ts
│   │   │   │   ├── agent-router.ts
│   │   │   │   ├── execution-coordinator.ts
│   │   │   │   └── fallback-handler.ts
│   │   │   ├── embeddings/                  # Vector embeddings
│   │   │   │   ├── embedding.service.ts
│   │   │   │   ├── vector-store.ts
│   │   │   │   ├── similarity.service.ts
│   │   │   │   └── document-processor.ts
│   │   │   ├── monitoring/                  # AI monitoring and analytics
│   │   │   │   ├── performance-monitor.ts
│   │   │   │   ├── cost-tracker.ts
│   │   │   │   ├── quality-assessor.ts
│   │   │   │   └── usage-analytics.ts
│   │   │   ├── cache/                       # AI response caching
│   │   │   │   ├── response-cache.ts
│   │   │   │   ├── embedding-cache.ts
│   │   │   │   └── model-cache.ts
│   │   │   ├── security/                    # AI security measures
│   │   │   │   ├── content-filter.ts
│   │   │   │   ├── prompt-injection-detector.ts
│   │   │   │   ├── sensitive-data-detector.ts
│   │   │   │   └── rate-limiter.ts
│   │   │   └── utils/                       # Utility functions
│   │   │       ├── token-counter.ts
│   │   │       ├── text-processor.ts
│   │   │       ├── schema-validator.ts
│   │   │       ├── retry-handler.ts
│   │   │       └── error-handler.ts
│   │   └── package.json
│   │
│   └── config/                    # Shared configurations
│       ├── eslint/
│       ├── typescript/
│       ├── tailwind/
│       └── jest/
│
├── tools/                         # Development tools
│   ├── scripts/                   # Build and deployment scripts
│   ├── docker/                    # Docker configurations
│   │   ├── Dockerfile.web
│   │   ├── Dockerfile.server
│   │   └── docker-compose.yml
│   └── k8s/                      # Kubernetes manifests
│
├── .github/                      # GitHub workflows
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd.yml
│   │   ├── security.yml
│   │   └── release.yml
│   └── ISSUE_TEMPLATE/
│
├── docs/                         # Project documentation
│   ├── architecture/
│   ├── api/
│   ├── deployment/
│   └── contributing/
│
├── turbo.json                    # Turborepo configuration
├── package.json                  # Root package.json
├── pnpm-workspace.yaml          # pnpm workspace config
├── .env.example                 # Environment variables template
└── README.md

```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8.0.0
- PostgreSQL

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/riaz37/komerbazar.git
   cd komerbazar
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:

   - Copy `.env.example` to `.env` in both `apps/server` and `packages/database`
   - Update the environment variables with your configuration

4. Start the development server:
   ```bash
   pnpm dev
   ```

## 🧪 Running Tests

```bash
# Run unit tests
pnpm test

# Run e2e tests
pnpm test:e2e

# Run test coverage
pnpm test:cov
```

## 🛠 Development

### Database Migrations

```bash
# Generate new migration
cd packages/database
pnpm migrate

# Apply migrations
pnpm push
```

### Code Formatting

```bash
# Format code
pnpm format

# Lint code
pnpm lint
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

---

## About Turborepo

This project uses Turborepo for monorepo management. Below is the original Turborepo documentation for reference.

## What's inside?

This Turborepo includes the following packages/apps:

### Apps

- `server`: A [NestJS](https://nestjs.com/) backend application

### Packages

- `database`: Database schema, migrations, and models using Drizzle ORM
- `@repo/typescript-config`: Shared TypeScript configurations
- `@repo/eslint-config`: Shared ESLint configurations

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo
pnpm dev
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)
