# Contributing to Claude Models CLI

Thank you for your interest in contributing! 🎉

Built with [Bun](https://bun.sh) - a fast all-in-one JavaScript runtime.

## Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Build the project:
   ```bash
   bun run build
   ```
4. Make your changes in `src/`
5. Run in dev mode (auto-rebuild):
   ```bash
   bun run dev
   ```
6. Test thoroughly:
   ```bash
   bun test
   ```

## Adding a New Provider

To add support for a new model provider (e.g., Groq, TogetherAI):

1. Create a new file in `src/providers/`: `ProviderName.ts`
2. Implement the provider class:

   ```typescript
   import { Model } from '../types';

   export class ProviderNameProvider {
     async fetchModels(limit: number = 10): Promise<Model[]> {
       // Fetch models from provider's API
       // Transform to Model[] with: id, name, provider, contextLength, description, score, source
       return [];
     }
   }
   ```

3. Register the provider in `src/index.ts`:
   ```typescript
   this.providers.set('providername', new ProviderNameProvider());
   ```
4. Update documentation in `README.md`
5. Add tests for your provider (optional but encouraged)

## Code Style

- Use TypeScript with strict mode
- Follow existing naming conventions (camelCase, PascalCase for classes)
- Add error handling with try/catch
- Include JSDoc comments for public functions
- Use async/await over promises when appropriate
- Write clear, self-documenting code

## TypeScript Standards

```typescript
// Good
interface Model {
  id: string;
  name: string;
  score: number;
}

// Use optional chaining and nullish coalescing
const value = obj?.property ?? 'default';

// Use const/let appropriately
const immutable = 'value';
let mutable = 'value';
```

## Testing

We use Bun's built-in test runner:

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/claude-models-cli.test.ts

# Run with coverage
bun test --coverage
```

## Project Conventions

- CLI commands: `cm` (main), `cm1-cm10` (shortcuts), `cla` (auto-fallback)
- Configuration: `~/.claude-models-cli/config.json`
- Models are scored based on programming suitability
- Score factors: programming keywords (+100), reasoning (+50), provider reputation (+30), context length bonus (+max 50)

## Pull Request Process

1. Update README.md with details of changes
2. Update version in `package.json` if adding features
3. Ensure all tests pass (`bun test`)
4. Run type checking (`bun run types`)
5. Request review from maintainers

## Questions?

Open an issue or reach out to the maintainers.
