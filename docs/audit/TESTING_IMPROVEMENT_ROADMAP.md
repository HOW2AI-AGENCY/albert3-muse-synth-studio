# 🧪 Testing Improvement Roadmap
**Agent**: QA & Testing Strategist  
**Date**: 2025-10-26  
**Project**: Albert3 Muse Synth Studio v2.7.4

## Current Coverage

| Test Type | Current | Target | Gap |
|-----------|---------|--------|-----|
| Unit Tests | 55% | 85%+ | -30% |
| Integration Tests | 28% | 70%+ | -42% |
| E2E Tests | 30% | 60%+ | -30% |

## Critical Gaps

### Missing Unit Tests
- [ ] `useSavedLyrics` hook - 0% coverage
- [ ] `useAudioLibrary` hook - 0% coverage
- [ ] Edge Functions validation logic - 15% coverage
- [ ] React components memoization - 10% coverage

### Missing E2E Tests
- [ ] Lyrics Library complete user flow
- [ ] Audio Library upload + playback
- [ ] Stems separation end-to-end
- [ ] Mobile navigation scenarios

## Roadmap to 80%+ Coverage

### Phase 1 (Week 1-2): Unit Tests
```typescript
// tests/unit/hooks/useSavedLyrics.test.ts
describe('useSavedLyrics', () => {
  it('should fetch lyrics with filters', async () => {
    const { result } = renderHook(() => 
      useSavedLyrics({ folder: 'My Folder' })
    );
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.lyrics).toHaveLength(5);
  });
  
  it('should debounce search queries', async () => {
    const { result, rerender } = renderHook(
      ({ search }) => useSavedLyrics({ search }),
      { initialProps: { search: '' } }
    );
    
    rerender({ search: 'test' });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1), { timeout: 500 });
  });
});
```

### Phase 2 (Week 3-4): E2E Tests
```typescript
// tests/e2e/lyrics-library.spec.ts
test('complete lyrics workflow', async ({ page }) => {
  await page.goto('/workspace/lyrics-library');
  
  // Search for lyrics
  await page.fill('[placeholder="Поиск по лирике..."]', 'love');
  await expect(page.locator('[role="article"]')).toHaveCount(3);
  
  // Select and view
  await page.click('[role="article"]', { first: true });
  await expect(page.locator('[data-testid="lyrics-preview"]')).toBeVisible();
  
  // Save to favorites
  await page.click('[aria-label*="favorites"]');
  await expect(page.locator('text=Added to favorites')).toBeVisible();
});
```

### Phase 3 (Week 5-6): Performance & Visual Tests
- Lighthouse CI integration
- Percy visual regression tests
- Load testing (k6)

**Estimated Effort**: 6 weeks  
**Expected ROI**: +150% bug detection, -40% production incidents

_Report by QA & Testing Strategist Agent_
