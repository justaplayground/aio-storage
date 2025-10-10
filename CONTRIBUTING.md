# Contributing to AIO Storage

Thank you for your interest in contributing to AIO Storage! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/aio-storage.git
   cd aio-storage
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment**

   ```bash
   cp .env.example .env
   ```

4. **Start development environment**
   ```bash
   npm run docker:up  # Start infrastructure
   npm run dev        # Start all apps in dev mode
   ```

## Project Structure

```
aio-storage/
├── apps/
│   ├── api/          # Express.js REST API
│   ├── web/          # Next.js frontend
│   └── worker/       # Background job processor
├── packages/
│   ├── shared/       # Shared types, validations, utilities
│   └── database/     # MongoDB models and connection
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define proper types/interfaces
- Avoid `any` types

### Code Style

- Use ES6+ features
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic

### Commits

- Write clear, descriptive commit messages
- Follow conventional commits format:
  - `feat:` New feature
  - `fix:` Bug fix
  - `docs:` Documentation changes
  - `style:` Code style changes
  - `refactor:` Code refactoring
  - `test:` Adding tests
  - `chore:` Maintenance tasks

Example:

```bash
git commit -m "feat: add file upload with progress tracking"
git commit -m "fix: resolve MongoDB connection timeout issue"
```

## Adding New Features

### Backend (API)

1. **Create models** in `packages/database/src/models/`
2. **Add types** in `packages/shared/src/types/`
3. **Add validations** in `packages/shared/src/validations/`
4. **Create controllers** in `apps/api/src/controllers/`
5. **Add routes** in `apps/api/src/routes/`
6. **Update documentation**

Example route structure:

```typescript
// apps/api/src/routes/files.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { fileController } from "../controllers/file.controller";

const router = Router();

router.post("/upload", authenticate, fileController.upload);
router.get("/:id", authenticate, fileController.getFile);

export default router;
```

### Frontend (Web)

1. **Create pages** in `apps/web/src/app/`
2. **Create components** in `apps/web/src/components/`
3. **Add API methods** in `apps/web/src/lib/api.ts`
4. **Update store** in `apps/web/src/store/` if needed
5. **Use Shadcn/UI components** for consistency

Example page structure:

```typescript
// apps/web/src/app/files/page.tsx
"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

export default function FilesPage() {
  // Component logic
}
```

### Worker

1. **Create processor** in `apps/worker/src/processors/`
2. **Register consumer** in `apps/worker/src/index.ts`
3. **Add job types** in `packages/shared/src/types/`

Example processor:

```typescript
// apps/worker/src/processors/example.processor.ts
export class ExampleProcessor {
  public async process(job: IExampleJob): Promise<void> {
    // Processing logic
  }
}
```

## Testing

Currently, the project doesn't have automated tests. When adding tests:

1. Use Jest for unit tests
2. Use Supertest for API tests
3. Place tests next to the code they test
4. Name test files with `.test.ts` or `.spec.ts`

## Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Write clean, well-documented code
   - Follow the coding standards
   - Test your changes locally

3. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

4. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Go to GitHub and create a PR
   - Describe your changes clearly
   - Link any related issues
   - Wait for review

## Code Review

- Be open to feedback
- Respond to comments promptly
- Make requested changes
- Keep discussions professional and constructive

## Questions?

If you have questions:

1. Check the README.md
2. Review existing code for examples
3. Open an issue for discussion

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
