# Contributing to Albert3 Muse Synth Studio

## 🤝 Welcome Contributors!

Thank you for your interest in contributing to Albert3 Muse Synth Studio! This guide will help you get started.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Protected Files](#protected-files)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Questions](#questions)

## 📜 Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/). By participating, you are expected to uphold this code.

## 🔄 Development Workflow

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/albert3-muse-synth.git
cd albert3-muse-synth
npm install
```

### 2. Create a Branch

Use descriptive branch names:

- `feature/` - New features (e.g., `feature/add-lyrics-editor`)
- `fix/` - Bug fixes (e.g., `fix/player-audio-loading`)
- `refactor/` - Code refactoring (e.g., `refactor/extract-hooks`)
- `docs/` - Documentation updates (e.g., `docs/update-readme`)
- `test/` - Test additions (e.g., `test/add-repository-tests`)

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes

Follow our [Code Style](#code-style) guidelines.

### 4. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <description>

git commit -m "feat(generator): add vocal gender selection"
git commit -m "fix(player): resolve audio preloading issue"
git commit -m "refactor(hooks): extract useTracksMutations"
git commit -m "docs(readme): update installation guide"
git commit -m "test(repository): add unit tests for findAll"
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation
- `test` - Tests
- `style` - Code style (formatting)
- `perf` - Performance improvement
- `chore` - Maintenance tasks

### 5. Push & Create Pull Request

```bash
git push origin feature/your-feature-name
```

## 🎨 Code Style

### TypeScript

- ✅ **Strict mode enabled** - All `strict` flags are on
- ✅ **No `any`** - Use proper types or `unknown`
- ✅ **Explicit return types** for public functions
- ✅ **JSDoc required** for public APIs

```typescript
/**
 * Generate music from prompt
 * @param prompt - Music description
 * @returns Generated track ID
 */
export async function generateMusic(prompt: string): Promise<string> {
  // Implementation
}
```

### React

- ✅ **Functional components** only (no class components)
- ✅ **Custom hooks** for reusable logic
- ✅ **React.memo** for expensive components
- ✅ **useCallback/useMemo** for optimization

```typescript
export const TrackCard = React.memo(({ track, onPlay }: TrackCardProps) => {
  const handlePlay = useCallback(() => {
    onPlay(track.id);
  }, [track.id, onPlay]);

  return (
    <Card onClick={handlePlay}>
      <h3>{track.title}</h3>
    </Card>
  );
});

TrackCard.displayName = 'TrackCard';
```

### File Naming

- **Components:** `PascalCase.tsx` (e.g., `TrackCard.tsx`)
- **Hooks:** `camelCase.ts` (e.g., `useTracks.ts`)
- **Utils:** `camelCase.ts` (e.g., `formatters.ts`)
- **Constants:** `UPPER_SNAKE_CASE.ts` (e.g., `API_CONSTANTS.ts`)
- **Types:** `kebab-case.types.ts` (e.g., `track.types.ts`)

### Imports

```typescript
// ✅ CORRECT: Use absolute imports with @ alias
import { Track } from '@/types/domain/track.types';
import { getTrackRepository } from '@/repositories';

// ❌ WRONG: Don't use relative imports for deep paths
import { Track } from '../../../types/domain/track.types';

// ✅ CORRECT: Use Repository Pattern
import { getTrackRepository } from '@/repositories';
const repository = getTrackRepository();

// ❌ WRONG: Don't import Supabase directly in components
import { supabase } from '@/integrations/supabase/client';
```

## 🔒 Protected Files

**CRITICAL:** These files require Team Lead approval before modification:

```
src/config/breakpoints.config.ts
src/types/domain/track.types.ts
src/repositories/interfaces/TrackRepository.ts
.protectedrc.json
```

See [`.protectedrc.json`](./.protectedrc.json) for the complete list.

### How to Request Approval

1. Open an issue: `[PROTECTED] Modify <filename>`
2. Explain your rationale and proposed changes
3. Wait for Team Lead approval
4. Add `[APPROVED]` to your commit message

```bash
git commit -m "refactor(types): update Track interface [APPROVED]"
```

**Note:** Pre-commit hooks will **block** commits to protected files without approval.

## 🧪 Testing Requirements

Before submitting a PR:

- [ ] All tests pass: `npm test`
- [ ] New features have unit tests (target: >80% coverage)
- [ ] Critical paths have integration tests
- [ ] No ESLint errors: `npm run lint`
- [ ] TypeScript compiles: `npm run type-check`

### Writing Tests

```typescript
// Unit test example
import { describe, it, expect } from 'vitest';
import { formatDuration } from '@/utils/formatters';

describe('formatDuration', () => {
  it('should format seconds to mm:ss', () => {
    expect(formatDuration(125)).toBe('2:05');
  });
});
```

### Running Tests

```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e           # E2E tests (Playwright)
npm run test:coverage      # Coverage report
```

## 📝 Pull Request Process

### 1. Fill Out PR Template

Provide:
- Description of changes
- Related issues (e.g., `Fixes #123`)
- Screenshots (if UI changes)
- Testing checklist

### 2. Request Review

Assign Team Lead or relevant maintainers.

### 3. Pass CI/CD Checks

All automated checks must pass:
- ✅ Tests pass
- ✅ ESLint passes
- ✅ TypeScript compiles
- ✅ Protected files validation

### 4. Address Feedback

Respond to review comments and make requested changes.

### 5. Squash & Merge

Maintain a clean git history.

## ✅ Code Review Checklist

Reviewers will check:

- [ ] Follows naming conventions
- [ ] Has tests (unit + integration)
- [ ] No performance regressions
- [ ] Backward compatible (or breaking changes documented)
- [ ] Documentation updated
- [ ] No `console.log` (use `logger` from `@/utils/logger`)
- [ ] No direct Supabase imports (use Repository Pattern)
- [ ] No hardcoded values (use constants/config)
- [ ] Proper error handling
- [ ] Accessibility (ARIA attributes, keyboard navigation)

## 🐛 Reporting Bugs

Use GitHub Issues with the **Bug Report** template:

1. Describe the bug
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots (if applicable)
5. Environment (browser, OS, version)

## 💡 Suggesting Features

Use GitHub Issues with the **Feature Request** template:

1. Describe the feature
2. Use case / motivation
3. Proposed implementation (optional)
4. Alternatives considered

## 📞 Questions?

- 💬 [GitHub Discussions](https://github.com/your-org/albert3-muse-synth/discussions)
- 📧 Email: dev@albert3.app
- 📚 [Documentation](./docs/)

## 🎉 Thank You!

Your contributions make Albert3 Muse Synth Studio better for everyone!

---

**Happy Coding! 🚀**
