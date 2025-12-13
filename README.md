# FieldView.Live

Monetization platform for youth sports live streaming.

## Architecture

Monorepo structure using pnpm workspaces:

- `packages/data-model`: Shared TypeScript interfaces, Zod schemas, and Prisma schema
- `apps/api`: Express API server
- `apps/web`: Next.js frontend

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose (for local development)

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local services (PostgreSQL, Redis)

```bash
docker-compose up -d
```

### 3. Set up database

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate
```

### 4. Configure environment variables

Copy `.env.example` files in `apps/api` and `apps/web` and fill in required values.

### 5. Start development servers

```bash
# Start API and Web in parallel
pnpm dev

# Or start individually
pnpm --filter api dev
pnpm --filter web dev
```

## Development

### Running tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Linting and formatting

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Type checking

```bash
pnpm type-check
```

## Project Structure

```
fieldview-live/
├── packages/
│   └── data-model/          # Shared types, schemas, Prisma
├── apps/
│   ├── api/                 # Express API server
│   └── web/                 # Next.js frontend
├── docs/                    # Specifications and design docs
├── docker-compose.yml       # Local development services
└── pnpm-workspace.yaml      # pnpm workspace config
```

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Express.js, TypeScript, Prisma, PostgreSQL
- **Infrastructure**: Railway, Docker, Redis
- **External Services**: Twilio (SMS), SendGrid (Email), Square (Payments), Mux (Streaming)

## Documentation

See `docs/` directory for:
- Product specifications
- API documentation
- Design document
- User flows

## License

Private - All rights reserved
