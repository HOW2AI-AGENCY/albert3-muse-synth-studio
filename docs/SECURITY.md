# Security Implementation Guide

This document outlines the security measures implemented in the Albert3 Muse Synth Studio project.

## ✅ Implemented Security Measures

### 1. Database Security

#### Row-Level Security (RLS)
All tables have RLS enabled with policies that enforce:
- Users can only access their own data
- Public data is accessible based on `is_public` flags
- Admin users have elevated privileges via role-based access control

#### Security Definer Functions
All SECURITY DEFINER functions now have `SET search_path = 'public'` to prevent:
- Search path manipulation attacks
- Privilege escalation via schema injection

Functions secured:
- `has_role()` - Role validation
- `increment_play_count()` - Play counter
- `increment_view_count()` - View counter
- `increment_download_count()` - Download counter
- `notify_track_ready()` - Track notification trigger
- `notify_track_liked()` - Like notification trigger
- `create_version_from_extended_track()` - Version creation trigger
- `handle_new_user()` - User profile creation

### 2. Webhook Security

#### HMAC Signature Verification
All webhook endpoints now verify HMAC-SHA256 signatures:
- `suno-callback` - Track generation callbacks
- `lyrics-callback` - Lyrics generation callbacks  
- `stems-callback` - Stem separation callbacks

**Implementation:**
```typescript
const signature = req.headers.get('X-Suno-Signature');
const SUNO_WEBHOOK_SECRET = Deno.env.get('SUNO_WEBHOOK_SECRET');

if (SUNO_WEBHOOK_SECRET) {
  if (!signature) {
    return new Response(JSON.stringify({ error: 'missing_signature' }), {
      status: 401
    });
  }
  
  const isValid = await verifyWebhookSignature(bodyText, signature, SUNO_WEBHOOK_SECRET);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'invalid_signature' }), {
      status: 401
    });
  }
}
```

**Setup Required:**
To enable webhook verification, set the `SUNO_WEBHOOK_SECRET` environment variable:
1. Contact Suno API support to obtain your webhook secret
2. Add the secret via Lovable Cloud backend settings
3. Webhooks will automatically verify signatures once configured

### 3. Input Validation

#### Zod Schema Validation
All edge functions now use Zod schemas for type-safe input validation:

**Validated Endpoints:**
- `generate-suno` - Music generation
- `extend-track` - Track extension
- `create-cover` - Cover generation
- `separate-stems` - Stem separation
- `improve-prompt` - AI prompt enhancement

**Example:**
```typescript
import { generateSunoSchema, validateAndParse } from '../_shared/zod-schemas.ts';

const result = validateAndParse(generateSunoSchema, await req.json());
if (!result.success) {
  return new Response(
    JSON.stringify({ 
      error: 'validation_error',
      details: result.errors.format()
    }),
    { status: 400 }
  );
}

const validatedData = result.data;
```

**Protected Against:**
- Type confusion attacks
- Parameter injection
- Array/string bombs
- Invalid URLs (only HTTPS allowed)
- Out-of-range numeric values
- XSS via malformed input

### 4. Authentication & Authorization

#### Role-Based Access Control (RBAC)
User roles are stored in a separate `user_roles` table with enum type:
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
```

**Security Features:**
- Roles checked server-side via `has_role()` function
- No client-side role storage (prevents privilege escalation)
- RLS policies enforce role-based data access

#### JWT Verification
Most edge functions require valid JWT tokens:
- Configured in `supabase/config.toml` with `verify_jwt = true`
- Only public webhooks have `verify_jwt = false`
- All authenticated endpoints verify user identity

### 5. Content Security

#### Text Sanitization
All user-provided text is sanitized to prevent XSS:
```typescript
function sanitizeText(text: string | undefined): string | null {
  if (!text) return null;
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .substring(0, 10000);
}
```

#### URL Validation
Only HTTPS URLs are accepted for external resources:
- Audio references
- Cover images
- Video content

### 6. Rate Limiting & Payload Protection

#### Payload Size Limits
All webhook endpoints enforce 5MB payload limits:
```typescript
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB

if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
  return new Response(JSON.stringify({ error: 'payload_too_large' }), {
    status: 413
  });
}
```

## ⚠️ Manual Configuration Required

### 1. Leaked Password Protection
**Status:** Currently disabled  
**Action Required:** Enable in Supabase Auth settings

**Steps:**
1. Go to Lovable Cloud backend settings
2. Navigate to Authentication
3. Enable "Leaked Password Protection"
4. This prevents users from using passwords found in data breaches

**Documentation:** https://docs.lovable.dev/features/security#leaked-password-protection-disabled

### 2. Webhook Secret Configuration
**Status:** Optional but recommended  
**Action Required:** Set `SUNO_WEBHOOK_SECRET`

**Steps:**
1. Contact Suno API support (support@sunoapi.org)
2. Request webhook signing feature and obtain secret
3. Add secret to Lovable Cloud backend via Settings → Secrets
4. Signature verification will activate automatically

## 🔍 Security Monitoring

### Callback Logging
All webhook callbacks are logged to `callback_logs` table:
- Payload content
- Error messages  
- Timestamp tracking

**Future Enhancement:**
Add signature validation tracking:
```sql
ALTER TABLE callback_logs 
  ADD COLUMN signature_valid BOOLEAN,
  ADD COLUMN signature_header TEXT;
```

### Database Indexes
Performance indexes added for security queries:
- `idx_track_versions_parent_id` - Fast version lookups
- `idx_track_versions_parent_version` - Version number queries
- `idx_track_versions_master` - Master version filtering

## 📊 Security Checklist

- [x] RLS enabled on all tables
- [x] SECURITY DEFINER functions have fixed search_path
- [x] Webhook HMAC verification implemented
- [x] Input validation with Zod schemas
- [x] Text sanitization for XSS prevention
- [x] HTTPS-only URL validation
- [x] Payload size limits enforced
- [x] JWT verification on authenticated endpoints
- [x] Role-based access control
- [ ] Leaked password protection (requires manual enablement)
- [ ] Webhook secret configured (requires Suno API key)

## 🔒 Best Practices

1. **Never trust client input** - Always validate server-side
2. **Use prepared statements** - Supabase client handles this automatically
3. **Principle of least privilege** - Users only access their own data
4. **Defense in depth** - Multiple security layers (RLS + JWT + validation)
5. **Monitor and audit** - Use `callback_logs` for suspicious activity
6. **Keep secrets secret** - Never expose webhook secrets or service role keys

## 📚 Additional Resources

- [Lovable Security Documentation](https://docs.lovable.dev/features/security)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/database-linter)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
