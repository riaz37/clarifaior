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
.
├── apps/
│   └── server/          # NestJS backend application
├── packages/
│   ├── database/       # Database schema and migrations
│   └── ui/              # Shared UI components library
├── package.json          # Root package.json with workspace config
└── pnpm-workspace.yaml   # pnpm workspace configuration
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
