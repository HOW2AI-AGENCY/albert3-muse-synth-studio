# 🧪 Testing Guidelines - Albert3 Muse Synth Studio

**Version**: 1.0.0  
**Last Updated**: 2025-10-31  
**Audience**: Developers, QA Engineers

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Testing Strategy](#testing-strategy)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [E2E Testing](#e2e-testing)
6. [Edge Functions Testing](#edge-functions-testing)
7. [Best Practices](#best-practices)
8. [CI/CD Integration](#cicd-integration)

---

## 🎯 Overview

Our testing strategy follows the **Testing Pyramid** approach:

```
        /\
       /  \      E2E Tests (20%)
      /____\     - Critical user flows
     /      \    - Cross-browser testing
    /________\   
   /          \  Integration Tests (30%)
  /____________\ - API contracts
 /              \ - Database queries
/________________\ Unit Tests (50%)
                  - Pure functions
                  - React components
                  - Hooks
```

### Coverage Targets

| Test Type | Current | Target |
|-----------|---------|--------|
| Unit Tests | 60% | 80%+ |
| Integration | 80% | 85%+ |
| E2E | 70% | 75%+ |

---

## 🏗️ Testing Strategy

### Test Categorization

**P0 (Critical)**: Must pass before deployment
- Authentication flows
- Music generation
- Payment processing
- Data loss prevention

**P1 (High)**: Should pass before deployment
- Track management
- Stem separation
- User preferences

**P2 (Medium)**: Can be deployed with known issues
- UI animations
- Analytics tracking
- Non-critical features

---

## 🔬 Unit Testing

### Framework: Vitest

**Location**: `src/**/__tests__/*.test.ts(x)`

### Writing Unit Tests

```typescript
// src/utils/__tests__/formatDuration.test.ts
import { describe, it, expect } from 'vitest';
import { formatDuration } from '../formatDuration';

describe('formatDuration', () => {
  it('formats seconds correctly', () => {
    expect(formatDuration(90)).toBe('1:30');
  });
  
  it('handles zero duration', () => {
    expect(formatDuration(0)).toBe('0:00');
  });
  
  it('handles negative duration', () => {
    expect(formatDuration(-10)).toBe('0:00');
  });
});
```

### Component Testing

```typescript
// src/components/__tests__/TrackCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TrackCard } from '../TrackCard';

describe('TrackCard', () => {
  const mockTrack = {
    id: '123',
    title: 'Test Track',
    artist: 'Test Artist',
  };
  
  it('renders track information', () => {
    render(<TrackCard track={mockTrack} />);
    
    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });
  
  it('calls onPlay when play button clicked', () => {
    const onPlay = vi.fn();
    render(<TrackCard track={mockTrack} onPlay={onPlay} />);
    
    fireEvent.click(screen.getByLabelText('Play'));
    
    expect(onPlay).toHaveBeenCalledWith('123');
  });
});
```

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Run specific test file
npm test TrackCard.test

# Run in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

---

## 🔗 Integration Testing

### Database Integration

```typescript
// src/services/__tests__/tracks.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { TracksService } from '../tracks.service';

describe('TracksService Integration', () => {
  beforeEach(async () => {
    // Clean up test data
    await supabase.from('tracks').delete().eq('title', 'Test Track');
  });
  
  it('creates track in database', async () => {
    const track = await TracksService.create({
      title: 'Test Track',
      prompt: 'Test prompt',
      user_id: 'test-user-id'
    });
    
    expect(track.id).toBeDefined();
    expect(track.title).toBe('Test Track');
  });
});
```

### API Integration

```typescript
// supabase/functions/tests/generate-suno.test.ts
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { createTestUser, installFetchMock } from "./_testUtils.ts";

Deno.test("generate-suno: creates track successfully", async () => {
  const { accessToken } = await createTestUser();
  
  const cleanup = installFetchMock({
    'https://api.sunoapi.org': () => 
      new Response(JSON.stringify({ code: 200, data: { taskId: 'test-123' } }))
  });
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-suno', {
      body: { prompt: 'Test prompt', tags: 'rock' },
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    assertEquals(error, null);
    assertExists(data.trackId);
  } finally {
    cleanup();
  }
});
```

---

## 🎭 E2E Testing

### Framework: Playwright

**Location**: `tests/e2e/*.spec.ts`

### Writing E2E Tests

```typescript
// tests/e2e/music-generation.spec.ts
import { test, expect } from '@playwright/test';
import { loginToApp } from './utils';

test.describe('Music Generation Flow', () => {
  test('should generate music from prompt', async ({ page }) => {
    await loginToApp(page);
    
    // Navigate to generation page
    await page.goto('/workspace/generate');
    
    // Fill in prompt
    await page.fill('[data-testid="prompt-input"]', 'Epic rock song');
    
    // Click generate
    await page.click('[data-testid="generate-button"]');
    
    // Wait for processing
    await expect(page.locator('text=Processing')).toBeVisible();
    
    // Verify track appears in library
    await page.goto('/workspace/library');
    await expect(page.locator('text=Epic rock song')).toBeVisible({ timeout: 30000 });
  });
});
```

### Best Practices for E2E

1. **Use Resilient Selectors**
   ```typescript
   // ✅ Good: Multiple fallbacks
   await page.click(
     '[data-testid="play-button"], ' +
     '[aria-label="Play"], ' +
     'button:has-text("Play")'
   );
   
   // ❌ Bad: Fragile CSS selector
   await page.click('.btn-primary.play-btn');
   ```

2. **Wait for Network Idle**
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. **Take Screenshots on Failure**
   ```typescript
   test.afterEach(async ({ page }, testInfo) => {
     if (testInfo.status !== testInfo.expectedStatus) {
       await page.screenshot({ 
         path: `screenshots/${testInfo.title}.png` 
       });
     }
   });
   ```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test
npx playwright test music-generation

# Debug mode
npx playwright test --debug

# View test report
npx playwright show-report
```

---

## 🚀 Edge Functions Testing

### Deno Test Framework

**Location**: `supabase/functions/tests/*.test.ts`

### Writing Edge Function Tests

```typescript
// supabase/functions/tests/generate-suno.test.ts
import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { createTestUser, installFetchMock } from "./_testUtils.ts";

Deno.test("should validate required parameters", async () => {
  const { accessToken } = await createTestUser();
  
  const { data, error } = await supabase.functions.invoke('generate-suno', {
    body: { /* missing prompt */ },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  assertExists(error);
});
```

### Mocking External APIs

```typescript
const cleanup = installFetchMock({
  'https://api.sunoapi.org/api/v1/gateway/generate/music': () => 
    new Response(JSON.stringify({
      code: 200,
      data: { taskId: 'mock-task-id' }
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    })
});

try {
  // Test logic here
} finally {
  cleanup(); // Restore real fetch
}
```

### Running Edge Function Tests

```bash
# Run all Deno tests
deno test --allow-all supabase/functions/tests/

# Run specific test
deno test --allow-all supabase/functions/tests/generate-suno.test.ts

# With coverage
deno test --allow-all --coverage=coverage/
```

---

## ✅ Best Practices

### 1. Test Naming Convention

```typescript
// ✅ Good: Descriptive names
test('should create track when valid prompt provided', ...)
test('should return error when user unauthorized', ...)

// ❌ Bad: Vague names
test('test1', ...)
test('works', ...)
```

### 2. AAA Pattern (Arrange, Act, Assert)

```typescript
test('should increment play count', async () => {
  // Arrange
  const track = createMockTrack({ play_count: 5 });
  
  // Act
  await incrementPlayCount(track.id);
  
  // Assert
  const updated = await getTrack(track.id);
  expect(updated.play_count).toBe(6);
});
```

### 3. Test Isolation

```typescript
beforeEach(async () => {
  // Clean up before each test
  await cleanupTestData();
});

afterEach(async () => {
  // Restore mocks
  vi.clearAllMocks();
});
```

### 4. Don't Test Implementation Details

```typescript
// ✅ Good: Test behavior
test('should show error message when login fails', async () => {
  render(<LoginForm />);
  fireEvent.submit(screen.getByRole('form'));
  
  await waitFor(() => {
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });
});

// ❌ Bad: Test implementation
test('should call setError with correct message', () => {
  const setError = vi.fn();
  const { result } = renderHook(() => useLogin(setError));
  
  result.current.login('wrong', 'password');
  expect(setError).toHaveBeenCalledWith('Invalid credentials');
});
```

### 5. Use Test Data Builders

```typescript
// utils/test-builders.ts
export const createMockTrack = (overrides = {}) => ({
  id: 'track-123',
  title: 'Test Track',
  artist: 'Test Artist',
  duration: 180,
  ...overrides
});

// In tests
const track = createMockTrack({ duration: 240 });
```

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_EMAIL: ${{ secrets.E2E_EMAIL }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Pre-commit Hook

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test -- --run",
      "pre-push": "npm run test:e2e"
    }
  }
}
```

---

## 📊 Test Coverage

### Viewing Coverage Report

```bash
# Generate coverage
npm test -- --coverage

# Open HTML report
open coverage/index.html
```

### Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80
      }
    }
  }
});
```

---

## 🆘 Troubleshooting

### Common Issues

**Issue**: Tests fail randomly
- **Solution**: Add proper `await` and `waitFor` for async operations

**Issue**: Mocks not working
- **Solution**: Ensure mocks are set up before imports

**Issue**: E2E tests timeout
- **Solution**: Increase timeout in `playwright.config.ts`

**Issue**: Database tests interfere with each other
- **Solution**: Use transactions and rollback after each test

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [Testing Library](https://testing-library.com)
- [Deno Testing](https://deno.land/manual/testing)

---

**Questions?** Ask in #testing Slack channel or create an issue.
