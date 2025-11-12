# Edge Function Deployment Guide - Generate Suno

## Issue: Failed to send a request to the Edge Function

This error typically occurs when:
1. The Edge Function is not deployed to your Supabase cloud project
2. Required environment variables (secrets) are not configured
3. CORS or authentication configuration is incorrect

## Solution Steps

### Step 1: Set Environment Variables in Supabase Dashboard

Before deploying, you need to set up the required secrets in your Supabase dashboard:

1. Go to: https://supabase.com/dashboard/project/qycfsepwguaiwcquwwbw/settings/functions
2. Add the following secrets:

**Required Secrets:**
- `SUNO_API_KEY` - Your Suno API key (CRITICAL - function won't work without this)
- `SUPABASE_URL` - https://qycfsepwguaiwcquwwbw.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (from Settings > API)

**Optional Secrets for monitoring:**
- `SENTRY_DSN` - Your Sentry DSN if you want error tracking
- `SENTRY_ENVIRONMENT` - production
- `SENTRY_RELEASE` - v1.0.0

**Optional Callback Configuration:**
- `SUNO_CALLBACK_URL` - https://qycfsepwguaiwcquwwbw.supabase.co/functions/v1/suno-callback

### Step 2: Deploy the Edge Function

Run this command to deploy the generate-suno function:

```bash
# Login to Supabase (if not already logged in)
npx supabase login

# Link to your project
npx supabase link --project-ref qycfsepwguaiwcquwwbw

# Deploy the generate-suno function
npx supabase functions deploy generate-suno --project-ref qycfsepwguaiwcquwwbw
```

### Step 3: Deploy ALL Related Functions

You need to deploy all functions that work together:

```bash
# Deploy all edge functions
npx supabase functions deploy generate-suno --project-ref qycfsepwguaiwcquwwbw
npx supabase functions deploy suno-callback --project-ref qycfsepwguaiwcquwwbw
npx supabase functions deploy sync-lyrics-job --project-ref qycfsepwguaiwcquwwbw
npx supabase functions deploy generate-lyrics --project-ref qycfsepwguaiwcquwwbw
npx supabase functions deploy lyrics-callback --project-ref qycfsepwguaiwcquwwbw
npx supabase functions deploy improve-prompt --project-ref qycfsepwguaiwcquwwbw
npx supabase functions deploy separate-stems --project-ref qycfsepwguaiwcquwwbw
npx supabase functions deploy stems-callback --project-ref qycfsepwguaiwcquwwbw
npx supabase functions deploy sync-stem-job --project-ref qycfsepwguaiwcquwwbw
npx supabase functions deploy get-balance --project-ref qycfsepwguaiwcquwwbw
npx supabase functions deploy suggest-styles --project-ref qycfsepwguaiwcquwwbw
```

### Step 4: Verify Deployment

After deployment, verify the function is working:

```bash
# Check function status
npx supabase functions list --project-ref qycfsepwguaiwcquwwbw

# Test the function (requires authentication token)
curl -i --location --request POST 'https://qycfsepwguaiwcquwwbw.supabase.co/functions/v1/generate-suno' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"prompt":"test", "title":"Test Track"}'
```

### Step 5: Check Function Logs

If still having issues, check the logs:

1. Go to: https://supabase.com/dashboard/project/qycfsepwguaiwcquwwbw/logs/edge-functions
2. Select "generate-suno" function
3. Look for error messages

## Common Issues & Solutions

### Issue 1: "SUNO_API_KEY not configured"
**Solution:** Add SUNO_API_KEY to Supabase dashboard secrets and redeploy

### Issue 2: "Supabase service role credentials are not configured"
**Solution:** Add SUPABASE_SERVICE_ROLE_KEY to dashboard secrets

### Issue 3: CORS errors in browser
**Solution:** Ensure the function is deployed and check CORS headers in logs

### Issue 4: "Authorization header required"
**Solution:** Ensure user is logged in before calling the function

### Issue 5: 404 Not Found
**Solution:** Function not deployed - run deploy command above

## Quick Deployment Script

Create this file to deploy all functions at once:

```bash
#!/bin/bash
# deploy-all-functions.sh

PROJECT_REF="qycfsepwguaiwcquwwbw"

echo "Deploying all Edge Functions to project: $PROJECT_REF"

functions=(
  "generate-suno"
  "suno-callback"
  "generate-lyrics"
  "lyrics-callback"
  "sync-lyrics-job"
  "improve-prompt"
  "separate-stems"
  "stems-callback"
  "sync-stem-job"
  "get-balance"
  "suggest-styles"
)

for func in "${functions[@]}"
do
  echo "Deploying $func..."
  npx supabase functions deploy "$func" --project-ref "$PROJECT_REF"
  if [ $? -eq 0 ]; then
    echo "✅ $func deployed successfully"
  else
    echo "❌ Failed to deploy $func"
  fi
done

echo "Deployment complete!"
```

Make it executable and run:
```bash
chmod +x deploy-all-functions.sh
./deploy-all-functions.sh
```

## Testing After Deployment

Test the function from your application:
1. Login to your app
2. Try generating music
3. Check browser console for detailed error messages
4. Check Supabase Edge Function logs if errors persist

## Need Help?

If you continue to experience issues:
1. Check the Supabase Edge Function logs
2. Verify all environment variables are set
3. Ensure you have valid SUNO_API_KEY
4. Check your Supabase project billing/usage limits
