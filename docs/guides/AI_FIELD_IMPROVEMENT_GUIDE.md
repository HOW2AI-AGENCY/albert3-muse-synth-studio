# AI Field Improvement - User Guide

**Version:** 1.0.0  
**Sprint:** 35 - AI-First Foundation  
**Status:** ✅ Production Ready

---

## 📋 Overview

AI Field Improvement is a context-aware system that uses Lovable AI to enhance text fields in music generation workflows. It provides three powerful actions: **improve**, **generate**, and **rewrite**.

### Key Features

✅ **Context-Aware**: Uses project and track metadata for better results  
✅ **Three AI Actions**: Improve existing text, generate new content, or rewrite in different style  
✅ **Subscription-Gated**: Integrated with subscription system (free tier: 10 uses/day)  
✅ **Error Handling**: Proper handling of rate limits and payment errors  
✅ **No Duplicate Requests**: Smart error handling prevents wasting credits  

---

## 🎯 Use Cases

### 1. Improve Prompt
Enhance existing music generation prompts with more professional and creative language.

**Example:**
- **Input:** "happy song"
- **Output:** "Uplifting and energetic pop anthem with bright synths and infectious melodies that radiate pure joy and celebration"

### 2. Generate Description
Create compelling descriptions for music projects or tracks.

**Example:**
- **Context:** Rock album about overcoming challenges
- **Output:** "A powerful journey through adversity and triumph, featuring heavy guitar riffs, thunderous drums, and emotionally charged vocals that inspire resilience and strength"

### 3. Rewrite Lyrics
Adapt lyrics to match a project's theme while maintaining the original essence.

**Example:**
- **Input:** "I love you so much, baby"
- **Theme:** Medieval fantasy
- **Output:** "My heart doth yearn for thee, fair maiden mine, through castle walls and ancient time"

---

## 🚀 Quick Start

### Step 1: Install Hook

```typescript
import { useAIImproveField } from '@/hooks/useAIImproveField';

const { improveField, isImproving, error } = useAIImproveField({
  onSuccess: (result) => {
    console.log('AI result:', result);
  },
  onError: (error) => {
    console.error('AI error:', error);
  },
});
```

### Step 2: Call AI Action

```typescript
const handleImprove = async () => {
  const result = await improveField({
    field: 'prompt',
    value: 'happy upbeat song',
    action: 'improve',
    context: 'Electronic dance music album',
    additionalContext: {
      genre: 'EDM',
      mood: 'energetic',
      bpm: 128,
    },
  });
  
  if (result) {
    setPrompt(result);
  }
};
```

### Step 3: Handle Loading State

```typescript
<Button 
  onClick={handleImprove}
  disabled={isImproving}
>
  {isImproving ? 'Improving...' : 'Improve with AI'}
</Button>

{error && (
  <Alert variant="destructive">
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

---

## 🔌 API Reference

### Hook: `useAIImproveField`

#### Options

```typescript
interface UseAIImproveFieldOptions {
  onSuccess?: (result: string) => void;
  onError?: (error: string) => void;
}
```

#### Returns

```typescript
{
  improveField: (params: ImproveFieldParams) => Promise<string | null>;
  isImproving: boolean;
  error: string | null;
}
```

#### Parameters: `ImproveFieldParams`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `field` | `string` | ✅ | Field name (e.g., 'prompt', 'lyrics', 'description') |
| `value` | `string` | ✅ | Current field value |
| `action` | `'improve' \| 'generate' \| 'rewrite'` | ✅ | AI action to perform |
| `context` | `string` | ❌ | Project/track context for better results |
| `additionalContext` | `Record<string, any>` | ❌ | Extra metadata (genre, mood, BPM, etc.) |

---

## 🎨 UI Components

### Basic Button with AI

```typescript
import { useAIImproveField } from '@/hooks/useAIImproveField';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export const AIImproveButton = ({ field, value, onResult }) => {
  const { improveField, isImproving } = useAIImproveField({
    onSuccess: onResult,
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => improveField({ field, value, action: 'improve' })}
      disabled={isImproving}
    >
      <Sparkles className="h-4 w-4 mr-2" />
      {isImproving ? 'Processing...' : 'Improve with AI'}
    </Button>
  );
};
```

### Dropdown with Multiple Actions

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const AIActionsDropdown = ({ field, value, onResult }) => {
  const { improveField, isImproving } = useAIImproveField({
    onSuccess: onResult,
  });

  const actions = [
    { label: 'Improve', action: 'improve' },
    { label: 'Rewrite', action: 'rewrite' },
    { label: 'Generate New', action: 'generate' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isImproving}>
          <Sparkles className="h-4 w-4 mr-2" />
          AI Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {actions.map(({ label, action }) => (
          <DropdownMenuItem
            key={action}
            onClick={() => improveField({ field, value, action })}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

---

## 🔒 Subscription Integration

### Check AI Usage Limits

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

export const AIFeature = () => {
  const { 
    hasAIAccess, 
    aiUsageToday, 
    aiUsageLimit,
    checkAIUsage 
  } = useSubscription();

  const handleAIAction = async () => {
    // Check if user has access
    if (!hasAIAccess) {
      toast.error('Upgrade to use AI features');
      return;
    }

    // Check usage limit
    const canUse = await checkAIUsage();
    if (!canUse) {
      toast.error(`Daily limit reached (${aiUsageLimit} uses/day)`);
      return;
    }

    // Proceed with AI action
    await improveField({ ... });
  };

  return (
    <div>
      <p>AI Usage: {aiUsageToday}/{aiUsageLimit}</p>
      <Button onClick={handleAIAction}>Use AI</Button>
    </div>
  );
};
```

---

## ⚠️ Error Handling

### Rate Limit Errors (429)

```typescript
const { improveField } = useAIImproveField({
  onError: (error) => {
    if (error.includes('Rate limit')) {
      toast.error('Too many requests. Please wait a moment.');
    }
  },
});
```

### Payment Required (402)

```typescript
const { improveField } = useAIImproveField({
  onError: (error) => {
    if (error.includes('credits')) {
      toast.error('Insufficient credits. Please upgrade your plan.');
    }
  },
});
```

### Generic Errors

```typescript
const { improveField, error } = useAIImproveField();

if (error) {
  // Display error to user
  toast.error(`AI failed: ${error}`);
}
```

---

## 🧪 Testing

### Unit Test Example

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useAIImproveField } from '@/hooks/useAIImproveField';

describe('useAIImproveField', () => {
  it('should improve field successfully', async () => {
    const { result } = renderHook(() => useAIImproveField());

    const improved = await result.current.improveField({
      field: 'prompt',
      value: 'test',
      action: 'improve',
    });

    await waitFor(() => {
      expect(improved).toBeTruthy();
      expect(result.current.isImproving).toBe(false);
    });
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('AI field improvement flow', async ({ page }) => {
  await page.goto('/workspace/generate');
  
  // Fill prompt
  await page.fill('[data-testid="prompt-input"]', 'test prompt');
  
  // Click AI improve button
  await page.click('[data-testid="ai-improve-button"]');
  
  // Wait for result
  await expect(page.locator('[data-testid="prompt-input"]')).not.toHaveValue('test prompt');
});
```

---

## 📊 Performance Considerations

### Response Times

- **Improve/Rewrite**: ~2-4 seconds (Gemini Flash)
- **Generate**: ~3-5 seconds (more complex prompts)

### Rate Limits

- **Free Tier**: 10 AI uses/day
- **Pro Tier**: 100 AI uses/day
- **Business Tier**: Unlimited

### Credit Usage

- Each AI action consumes **1 AI use** from daily quota
- Rate limit errors (429) **do not consume credits**
- Payment required errors (402) **do not consume credits**

---

## 🔧 Backend Configuration

### Edge Function

**Location:** `supabase/functions/ai-improve-field/index.ts`

**Environment Variables:**
- `LOVABLE_API_KEY` - Auto-configured by Lovable Cloud
- `SUPABASE_URL` - Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured

### Database Function

**Function:** `increment_ai_usage()`

```sql
CREATE OR REPLACE FUNCTION increment_ai_usage(_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    ai_usage_today = ai_usage_today + 1,
    updated_at = NOW()
  WHERE id = _user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📚 Additional Resources

- [Lovable AI Documentation](https://docs.lovable.dev/features/ai)
- [Subscription System Guide](./SUBSCRIPTION_SYSTEM_GUIDE.md)
- [Sprint 35 Status](../../project-management/sprints/SPRINT_35_STATUS.md)

---

## 🐛 Troubleshooting

### Issue: "AI improvement failed"
**Solution:** Check network connection and edge function logs

### Issue: "Rate limit exceeded"
**Solution:** Wait 1 minute before retrying. This error does not consume credits.

### Issue: "Insufficient credits"
**Solution:** Upgrade subscription plan or wait for daily reset

### Issue: Duplicate requests on errors
**Solution:** Ensure you're using version 1.0.0+ which includes proper error handling

---

**Last Updated:** 2025-11-17  
**Maintainer:** Albert3 Muse Synth Studio Team
