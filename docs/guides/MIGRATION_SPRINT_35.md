# Migration Guide - Sprint 35: AI-First Foundation

**Version:** From Sprint 34 → Sprint 35  
**Date:** 2025-11-17  
**Impact:** Backend + Frontend + Database

---

## 📋 Overview

Sprint 35 introduces AI-powered field improvement and subscription-based feature gating. This guide helps you understand what changed and how to migrate.

---

## 🎯 What's New

### 1. AI Field Improvement System
- ✅ New hook: `useAIImproveField`
- ✅ New edge function: `ai-improve-field`
- ✅ Context-aware AI actions (improve, generate, rewrite)
- ✅ Integrated with Lovable AI (Gemini Flash)

### 2. Subscription System
- ✅ New context: `SubscriptionContext`
- ✅ New database fields in `profiles` table
- ✅ AI usage tracking (daily quotas)
- ✅ Subscription tier management

### 3. Database Changes
- ✅ Added `subscription_tier` to profiles
- ✅ Added `subscription_plan` to profiles
- ✅ Added `ai_usage_today` to profiles
- ✅ Added `ai_usage_limit` to profiles
- ✅ Added `last_ai_reset_at` to profiles
- ✅ New function: `increment_ai_usage()`
- ✅ New function: `reset_daily_ai_usage()`

---

## 🚀 Migration Steps

### Step 1: Database Migration ✅ (Already Applied)

All database changes were applied automatically via migration:
- `20250117_add_ai_usage_tracking.sql`
- `20250117_add_subscription_system.sql`

**Verify migration:**

```sql
SELECT 
  subscription_tier,
  subscription_plan,
  ai_usage_today,
  ai_usage_limit
FROM profiles
LIMIT 1;
```

### Step 2: Update Frontend Code

#### A. Wrap App with SubscriptionProvider

**File:** `src/App.tsx`

```typescript
// OLD
import { QueryClientProvider } from '@tanstack/react-query';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes />
    </QueryClientProvider>
  );
}

// NEW
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider>
        <Routes />
      </SubscriptionProvider>
    </QueryClientProvider>
  );
}
```

#### B. Use Subscription Context

**File:** Any component needing subscription checks

```typescript
// OLD
const handleAIAction = async () => {
  // No checks, anyone could use AI
  await improveField({ ... });
};

// NEW
import { useSubscription } from '@/contexts/SubscriptionContext';

const { hasAIAccess, checkAIUsage } = useSubscription();

const handleAIAction = async () => {
  if (!hasAIAccess) {
    toast.error('Upgrade to use AI features');
    return;
  }

  const canUse = await checkAIUsage();
  if (!canUse) {
    toast.error('Daily AI limit reached');
    return;
  }

  await improveField({ ... });
};
```

#### C. Add AI Buttons to Forms

**File:** `src/components/generator/MusicGeneratorV2.tsx` (example)

```typescript
import { useAIImproveField } from '@/hooks/useAIImproveField';

export const MusicGeneratorV2 = () => {
  const [prompt, setPrompt] = useState('');
  
  const { improveField, isImproving } = useAIImproveField({
    onSuccess: (result) => setPrompt(result),
  });

  return (
    <div>
      <Textarea 
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      
      <Button
        onClick={() => improveField({
          field: 'prompt',
          value: prompt,
          action: 'improve',
        })}
        disabled={isImproving}
      >
        Improve with AI
      </Button>
    </div>
  );
};
```

### Step 3: Environment Variables ✅ (Auto-configured)

These are automatically set by Lovable Cloud:
- `LOVABLE_API_KEY` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

**No action needed.**

### Step 4: Deploy Edge Function ✅ (Auto-deployed)

Edge function `ai-improve-field` is automatically deployed.

**Verify deployment:**

```bash
curl -X POST https://qycfsepwguaiwcquwwbw.supabase.co/functions/v1/ai-improve-field \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field": "prompt",
    "value": "test",
    "action": "improve"
  }'
```

---

## 🔄 Breaking Changes

### 1. No Direct AI Calls

**Before:**
```typescript
// ❌ Old way (if existed)
const response = await fetch('https://api.lovable.ai/...', {
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ ... }),
});
```

**After:**
```typescript
// ✅ New way
const { improveField } = useAIImproveField();
const result = await improveField({
  field: 'prompt',
  value: 'test',
  action: 'improve',
});
```

### 2. Subscription Checks Required

**Before:**
```typescript
// ❌ No checks
<Button onClick={handleAIFeature}>Use AI</Button>
```

**After:**
```typescript
// ✅ Check subscription
const { hasAIAccess } = useSubscription();

<Button 
  onClick={handleAIFeature}
  disabled={!hasAIAccess}
>
  {hasAIAccess ? 'Use AI' : 'Upgrade to use AI'}
</Button>
```

---

## 🎨 UI/UX Changes

### New Components

1. **AI Improvement Buttons**
   - Location: Text inputs, textareas
   - Design: Sparkles icon + "Improve with AI"
   - States: Default, Loading, Disabled

2. **Usage Indicators**
   - Location: Settings, Dashboard
   - Display: "AI Usage: 5/10 today"

3. **Upgrade Prompts**
   - Location: AI feature dialogs
   - Trigger: When user has no AI access
   - Action: Link to subscription page

### Updated Components

1. **MusicGeneratorV2**
   - Added: AI improve button for prompt
   - Added: AI generate button for description
   - Added: Usage quota display

2. **LyricsEditor**
   - Added: AI rewrite button
   - Added: Context-aware suggestions

---

## 🧪 Testing Updates

### New Tests

1. **Unit Tests**
   - `tests/unit/hooks/useAIImproveField.test.ts`
   - `tests/unit/contexts/SubscriptionContext.test.tsx`

2. **E2E Tests**
   - `tests/e2e/ai-field-improvement.spec.ts`
   - `tests/e2e/subscription-flow.spec.ts`

### Test Commands

```bash
# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test
```

---

## 📊 Performance Impact

### Metrics (Before → After)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| API Calls | N/A | +AI calls | New feature |
| Database Queries | ~50/min | ~55/min | +10% |
| Edge Function Load | ~100/min | ~120/min | +20% |
| Response Time | ~200ms | ~250ms | +25% |

### Optimization Tips

1. **Cache AI Results**: Store improved prompts to avoid re-generation
2. **Debounce AI Calls**: Wait 500ms after user stops typing
3. **Batch Requests**: If improving multiple fields, do them in parallel

---

## 🐛 Known Issues & Workarounds

### Issue 1: Duplicate Requests on Errors ✅ Fixed

**Problem:** Edge function retried on 429/402 errors, wasting credits

**Solution:** Implemented proper error handling in v1.0.0
- 429 errors now return immediately without retry
- 402 errors now return immediately without retry
- Both errors don't consume user credits

**Verify fix:**
```typescript
// Check edge function version
const { data } = await supabase.functions.invoke('ai-improve-field', {
  body: { field: 'test', value: 'test', action: 'improve' }
});
console.log(data.version); // Should be >= 1.0.0
```

### Issue 2: AI Usage Not Resetting

**Problem:** Daily usage counter not resetting at midnight

**Solution:** Cron job runs at 00:00 UTC via `reset_daily_ai_usage()`

**Manual reset:**
```sql
SELECT reset_daily_ai_usage();
```

---

## 🔒 Security Considerations

### API Key Management

✅ **Correct:** LOVABLE_API_KEY stored in Supabase secrets  
❌ **Wrong:** Never expose API keys in frontend code

### User Authentication

✅ **Correct:** Edge function validates JWT token  
❌ **Wrong:** No public AI endpoints without auth

### Rate Limiting

✅ **Correct:** Subscription-based quotas (10/day free, 100/day pro)  
❌ **Wrong:** Unlimited AI calls

---

## 📚 Additional Resources

- [AI Field Improvement Guide](./AI_FIELD_IMPROVEMENT_GUIDE.md)
- [Subscription System Guide](./SUBSCRIPTION_SYSTEM_GUIDE.md)
- [Sprint 35 Status](../../project-management/sprints/SPRINT_35_STATUS.md)
- [Lovable AI Documentation](https://docs.lovable.dev/features/ai)

---

## 🆘 Support

### Getting Help

1. **Check Logs:**
   ```bash
   # Edge function logs
   supabase functions logs ai-improve-field
   
   # Database logs
   SELECT * FROM logs WHERE function_name = 'increment_ai_usage';
   ```

2. **Report Issues:**
   - GitHub Issues: [albert3-muse-synth-studio/issues](https://github.com/...)
   - Discord: #support channel

3. **Emergency Rollback:**
   ```sql
   -- Disable AI feature temporarily
   UPDATE profiles SET ai_usage_limit = 0;
   ```

---

**Migration Status:** ✅ Complete  
**Last Updated:** 2025-11-17  
**Next Sprint:** Sprint 36 - Analytics Dashboard
