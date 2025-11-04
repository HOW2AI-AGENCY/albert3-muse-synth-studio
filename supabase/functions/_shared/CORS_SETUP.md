# CORS Configuration Guide

## Overview

Edge Functions use a secure CORS configuration that defaults to localhost-only access.

## Default Behavior (Development)

By default, the following origins are allowed:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:8080` (Alternative dev server)
- `http://127.0.0.1:5173`
- `http://127.0.0.1:8080`

## Production Setup

For production deployments, you **MUST** set the `CORS_ALLOWED_ORIGINS` environment variable.

### Setting CORS_ALLOWED_ORIGINS

1. **Supabase Dashboard:**
   - Navigate to Project Settings → Edge Functions
   - Add environment variable: `CORS_ALLOWED_ORIGINS`
   - Value: Comma-separated list of allowed origins

2. **Example Values:**

```bash
# Single domain
CORS_ALLOWED_ORIGINS=https://albert3.com

# Multiple domains
CORS_ALLOWED_ORIGINS=https://albert3.com,https://www.albert3.com

# With wildcards (for Vercel preview deployments)
CORS_ALLOWED_ORIGINS=https://albert3.com,https://*.vercel.app

# Complete example
CORS_ALLOWED_ORIGINS=https://albert3.com,https://www.albert3.com,https://albert3-muse-synth-studio.vercel.app,https://*.vercel.app
```

### Wildcard Patterns

Supported patterns:
- `https://*.vercel.app` - Matches any Vercel subdomain
- `https://*.albert3.com` - Matches any albert3.com subdomain
- `*` - **NOT RECOMMENDED** - Allows all origins (security risk)

### Subdomain Matching

The CORS handler automatically supports subdomain matching:
- If `https://albert3.com` is allowed, `https://app.albert3.com` is also allowed
- Protocol must match (http vs https)
- Port must match (or use default port 80/443)

## Security Best Practices

1. ✅ **Always specify exact domains** when possible
2. ✅ **Use wildcards only for preview deployments** (e.g., `https://*.vercel.app`)
3. ✅ **Never use `*` in production** (allows any website to call your API)
4. ✅ **Include both www and non-www** versions if needed
5. ✅ **Use HTTPS in production** (not HTTP)

## Testing CORS Configuration

### Test Locally
```bash
# Test with curl
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://your-project.supabase.co/functions/v1/your-function

# Expected response headers:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Credentials: true
# Vary: Origin
```

### Test Production
```bash
# Test with your production domain
curl -H "Origin: https://albert3.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://your-project.supabase.co/functions/v1/your-function
```

## Troubleshooting

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause:** Your origin is not in the CORS_ALLOWED_ORIGINS list.

**Solution:**
1. Check your current origin in browser console: `window.location.origin`
2. Add it to CORS_ALLOWED_ORIGINS environment variable
3. Redeploy Edge Functions

### Error: "CORS policy: Credentials flag is 'true'"

**Cause:** Your request includes credentials but CORS is set to `*`.

**Solution:**
- This should not happen with the new default configuration
- Ensure CORS_ALLOWED_ORIGINS is set to specific domains

## Implementation Details

The CORS handler (`supabase/functions/_shared/cors.ts`) provides:

1. **Dynamic origin matching** - Returns the exact requesting origin when allowed
2. **Wildcard support** - Matches patterns like `https://*.vercel.app`
3. **Subdomain matching** - Automatically allows subdomains of allowed domains
4. **Credentials support** - Sets `Access-Control-Allow-Credentials: true` when not using wildcard
5. **Vary header** - Properly caches responses per origin

## Migration from `*` to Whitelist

If you were previously using `*` (allow all origins):

1. **Identify your production domains**
2. **Set CORS_ALLOWED_ORIGINS** with your domains
3. **Test thoroughly** before deploying
4. **Monitor** for CORS errors in production

Example migration:
```bash
# Before: implicitly '*' (default)
# No CORS_ALLOWED_ORIGINS set

# After: explicit whitelist
CORS_ALLOWED_ORIGINS=https://albert3.com,https://*.vercel.app
```

## Additional Resources

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [OWASP CORS Security Guide](https://cheatsheetseries.owasp.org/cheatsheets/CORS_Cheat_Sheet.html)
