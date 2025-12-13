# Monorepo & Tooling Setup

## Monorepo Structure

```
fieldview-live/
├── packages/
│   ├── data-model/          # @fieldview/data-model
│   └── api-client/          # @fieldview/api-client (optional)
├── apps/
│   ├── api/                 # Express API server
│   └── web/                 # Next.js frontend
├── docker-compose.yml       # Local development services
├── pnpm-workspace.yaml      # pnpm workspace config
├── package.json            # Root workspace scripts
├── tsconfig.base.json       # Shared TypeScript config
├── .eslintrc.js            # Shared ESLint config
├── .prettierrc             # Prettier config
└── .husky/                 # Git hooks
```

## Package Manager: pnpm

**Why pnpm**:
- Efficient disk usage (hard links)
- Strict dependency resolution
- Workspace support
- Fast installs

**Setup**:
```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm

# Verify version (>= 8.0.0)
pnpm --version
```

## Root Configuration Files

### `pnpm-workspace.yaml`

Defines workspace packages:

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

### Root `package.json`

Workspace scripts and shared dev dependencies:

```json
{
  "name": "fieldview-live",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter './apps/*' dev",
    "build": "pnpm --filter './packages/*' build && pnpm --filter './apps/*' build",
    "test": "pnpm --filter './packages/*' test && pnpm --filter './apps/*' test",
    "test:coverage": "pnpm --filter './packages/*' test:coverage && pnpm --filter './apps/*' test:coverage",
    "lint": "pnpm --filter './packages/*' lint && pnpm --filter './apps/*' lint",
    "type-check": "pnpm --filter './packages/*' type-check && pnpm --filter './apps/*' type-check"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "prettier": "^3.1.1",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

## TypeScript Configuration

### `tsconfig.base.json` (Shared Config)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "declaration": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@fieldview/data-model": ["./packages/data-model/src"],
      "@fieldview/data-model/*": ["./packages/data-model/src/*"]
    }
  },
  "exclude": ["node_modules", "dist", "build", ".next"]
}
```

Each package/app extends this base config.

## ESLint Configuration

### `.eslintrc.js` (Shared)

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.base.json',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'import/order': ['error', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc' },
    }],
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.base.json',
      },
    },
  },
  ignorePatterns: ['node_modules', 'dist', 'build', '.next', '*.config.js'],
};
```

**Required Packages**:
- `eslint`
- `@typescript-eslint/parser`
- `@typescript-eslint/eslint-plugin`
- `eslint-plugin-import`
- `eslint-config-prettier`

## Prettier Configuration

### `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### `.prettierignore`

```
node_modules
dist
build
.next
coverage
*.log
pnpm-lock.yaml
```

## Git Hooks (Husky)

### Setup Husky

```bash
# Install Husky
pnpm add -D husky

# Initialize Husky
pnpm exec husky init
```

### `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Run tests (unit tests only, fast)
pnpm --filter './packages/*' test --run
pnpm --filter './apps/*' test:unit --run
```

**Note**: Pre-commit hooks should be fast. Full test suite runs in CI.

## Docker Compose (Local Development)

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: fieldview-postgres
    environment:
      POSTGRES_USER: fieldview
      POSTGRES_PASSWORD: dev_password_change_in_production
      POSTGRES_DB: fieldview_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fieldview"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: fieldview-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### Usage

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Reset database (WARNING: deletes all data)
docker-compose down -v
```

## Environment Variables

### Root `.env.example`

```bash
# Database (local development)
DATABASE_URL=postgresql://fieldview:dev_password_change_in_production@localhost:5432/fieldview_dev

# Redis (local development)
REDIS_URL=redis://localhost:6379

# Node Environment
NODE_ENV=development
```

Each app (`apps/api`, `apps/web`) will have its own `.env.example` with app-specific variables.

## Directory Structure Creation

### Initial Setup Commands

```bash
# Create directory structure
mkdir -p packages/data-model/src/{entities,schemas,utils}
mkdir -p packages/data-model/__tests__/unit
mkdir -p packages/api-client/src
mkdir -p apps/api/src/{routes,services,repositories,middleware,webhooks,lib}
mkdir -p apps/api/__tests__/{unit,integration}
mkdir -p apps/web/app
mkdir -p apps/web/components
mkdir -p apps/web/lib
mkdir -p apps/web/__tests__/{unit,e2e}
```

## Acceptance Criteria

- [ ] `pnpm-workspace.yaml` created and configured
- [ ] Root `package.json` with workspace scripts
- [ ] `tsconfig.base.json` with strict TypeScript settings
- [ ] `.eslintrc.js` configured and linting works
- [ ] `.prettierrc` configured and formatting works
- [ ] Husky pre-commit hook installed and working
- [ ] `docker-compose.yml` created
- [ ] Docker Compose services start successfully (Postgres + Redis)
- [ ] Directory structure created
- [ ] All root scripts (`pnpm lint`, `pnpm test`, etc.) work

## Next Steps

- Proceed to [03-openapi-and-contracts.md](./03-openapi-and-contracts.md) for Swagger-first API contracts
