# Development Workflow Guide

## Understanding the Project Structure

This is a monorepo with two types of workspaces:

### Apps (./apps/*)
These are runnable applications:
- **api** - Express.js REST API server
- **web** - Next.js frontend application
- **worker** - Background job processor

### Packages (./packages/*)
These are shared libraries used by the apps:
- **database** - MongoDB models and connection (used by `api` and `worker`)
- **shared** - Shared types, validations, and utilities (used by all apps)

## Development Scripts

### Default Development Mode (Recommended)
```bash
pnpm dev
```
- Builds packages once
- Runs only the apps (api, web, worker)
- Packages are NOT running in watch mode
- **Use this for normal development**

### Watch Mode (For Package Development)
```bash
pnpm dev:watch
```
- Runs everything including packages in watch mode
- Packages auto-rebuild when you change their code
- **Use this only when actively developing the shared packages**

### Run Individual Apps
```bash
pnpm dev:api      # Run only the API server
pnpm dev:web      # Run only the web frontend
pnpm dev:worker   # Run only the background worker
```

### Build Commands
```bash
pnpm build                # Build everything (packages + apps)
pnpm build:packages       # Build only the shared packages
```

### Package Watch Mode (Advanced)
```bash
pnpm watch:packages       # Watch and rebuild packages only
```
Run this in a separate terminal if you're actively editing types/models and want them to auto-rebuild.

## When Do Packages Need to Run?

### ❌ Packages DON'T need to run as separate processes
- They're just TypeScript libraries that compile to JavaScript
- Apps import the compiled code from `./dist` folders
- You only need to build them once before running apps

### ✅ When Package Watch Mode is Useful
Only use watch mode (`pnpm dev:watch` or `pnpm watch:packages`) when:
- You're actively editing database models
- You're changing shared types/interfaces
- You want immediate type checking across apps when you change packages

For normal app development, use `pnpm dev` - it's faster and cleaner!

## Docker Development

```bash
pnpm docker:up      # Start all services (MongoDB, Redis, RabbitMQ, API, Worker, Web)
pnpm docker:down    # Stop all services
pnpm docker:build   # Rebuild Docker images
pnpm docker:logs    # View logs
```

## Recommended Workflows

### Frontend Development
```bash
pnpm dev:web
```
Only runs Next.js. The web app calls the API, so start the API separately if needed.

### Backend Development
```bash
# Terminal 1
pnpm dev:api

# Terminal 2 (optional, if working with background jobs)
pnpm dev:worker
```

### Full Stack Development
```bash
pnpm dev
```
Runs all three apps. This is the default and most common use case.

### Package Development
```bash
# Terminal 1 - Watch packages for changes
pnpm watch:packages

# Terminal 2 - Run apps
turbo run dev --filter='./apps/*'
```

## Summary

**TL;DR:** 
- Use `pnpm dev` for normal development (no packages running)
- Use `pnpm dev:watch` only when editing shared packages
- Packages are just libraries - they don't need to run continuously!

