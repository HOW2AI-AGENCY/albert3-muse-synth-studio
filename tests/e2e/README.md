# 🎭 E2E Tests with Playwright

End-to-end tests for Albert3 Muse Synth Studio using Playwright.

## 📋 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Test Credentials

Create `.env.e2e` file with test account credentials:

```bash
cp .env.e2e.example .env.e2e
```

Edit `.env.e2e`:
```bash
E2E_EMAIL=your-test-email@example.com
E2E_PASSWORD=your-test-password
```

⚠️ **Important**: Use a dedicated test account, NOT your production account!

### 3. Install Playwright Browsers

```bash
npx playwright install chromium
```

## 🚀 Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run specific test file
```bash
npx playwright test tests/e2e/player.spec.ts
```

### Run in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run in debug mode
```bash
npx playwright test --debug
```

### Run with UI mode (interactive)
```bash
npx playwright test --ui
```

## 📊 Test Reports

### View HTML report
```bash
npx playwright show-report tests/e2e/artifacts/html-report
```

### View trace
```bash
npx playwright show-trace tests/e2e/artifacts/trace.zip
```

## 🧪 Test Structure

### Test Suites

1. **player.spec.ts** - Audio Player functionality
   - Play/pause tracks
   - Track switching
   - Seek operations
   - Version switching
   - Queue management
   - Playback persistence

2. **library.spec.ts** - Library smoke tests
   - Track listing
   - Pagination
   - Search filtering
   - Sorting
   - View modes (grid/list)
   - Like/unlike
   - Detail panel
   - Empty states

### Utilities (`utils.ts`)

Helper functions for common operations:
- `waitForAudioReady()` - Wait for audio to load
- `playTrack()` - Start playback
- `pauseTrack()` - Pause playback
- `navigateTo()` - Navigate to app routes
- `seekTo()` - Seek to specific time
- `getCurrentTime()` - Get playback position

## 🎯 Best Practices

### Stability
- Use `data-testid` attributes for reliable selectors
- Wait for network to be idle after navigation
- Add explicit waits for audio loading
- Handle flaky audio events with retries

### Performance
- Run tests in parallel when possible
- Use `test.skip()` for conditional tests
- Cache authentication state
- Reuse browser contexts

### Debugging
- Use `page.pause()` to inspect state
- Enable trace on failure
- Take screenshots on errors
- Use `--headed` mode to see browser

## 🔧 Configuration

See `playwright.config.ts` for:
- Timeout settings
- Retry logic
- Reporter configuration
- Screenshot/video settings
- Browser configuration

## 📈 CI Integration

Tests run automatically in GitHub Actions:
- On pull requests to `main`
- On pushes to `develop`
- Generate HTML reports
- Upload artifacts

### CI Environment Variables

Set in GitHub Secrets:
```
E2E_EMAIL=your-ci-test-email
E2E_PASSWORD=your-ci-test-password
```

## 🐛 Troubleshooting

### Tests timing out
- Increase timeout in `playwright.config.ts`
- Check network conditions
- Verify test account has data

### Audio not loading
- Check if test tracks exist in database
- Verify audio URLs are accessible
- Check browser audio permissions

### Authentication failing
- Verify credentials in `.env.e2e`
- Check if test account is active
- Review auth flow changes

### Flaky tests
- Add explicit waits
- Use retry logic
- Check for race conditions
- Review test isolation

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## 🎓 Writing New Tests

Example test structure:

```typescript
import { test, expect } from '@playwright/test';
import { navigateTo } from './utils';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, 'library');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const element = page.locator('[data-testid="my-element"]');
    
    // Act
    await element.click();
    
    // Assert
    await expect(element).toHaveAttribute('data-state', 'active');
  });
});
```

### Key Points
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests focused and independent
- Add comments for complex logic
- Use TypeScript for type safety

---

**Last Updated**: 2025-10-17  
**Version**: 2.7.2  
**Status**: Active Development
