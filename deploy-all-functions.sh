#!/bin/bash
# Deploy All Edge Functions Script
# This script deploys all edge functions to your Supabase project

PROJECT_REF="qycfsepwguaiwcquwwbw"

echo "============================================"
echo "Deploying all Edge Functions"
echo "Project: $PROJECT_REF"
echo "============================================"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if logged in
echo "Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Running login..."
    supabase login
fi

# Link to project
echo "Linking to project..."
supabase link --project-ref "$PROJECT_REF"

echo ""
echo "============================================"
echo "Starting deployment..."
echo "============================================"
echo ""

# Array of all edge functions
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

# Track deployment results
successful=0
failed=0
failed_functions=()

# Deploy each function
for func in "${functions[@]}"
do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Deploying: $func"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if npx supabase functions deploy "$func" --project-ref "$PROJECT_REF"; then
    echo "✅ $func deployed successfully"
    ((successful++))
  else
    echo "❌ Failed to deploy $func"
    ((failed++))
    failed_functions+=("$func")
  fi
  echo ""
done

echo ""
echo "============================================"
echo "Deployment Summary"
echo "============================================"
echo "✅ Successful: $successful"
echo "❌ Failed: $failed"

if [ $failed -gt 0 ]; then
  echo ""
  echo "Failed functions:"
  for func in "${failed_functions[@]}"; do
    echo "  - $func"
  done
  echo ""
  echo "💡 Tips for fixing deployment failures:"
  echo "  1. Check that the function files exist in supabase/functions/"
  echo "  2. Verify you have the correct permissions"
  echo "  3. Check the error messages above"
  echo "  4. Ensure all dependencies are installed"
  exit 1
else
  echo ""
  echo "🎉 All functions deployed successfully!"
  echo ""
  echo "Next steps:"
  echo "  1. Set environment variables in Supabase Dashboard:"
  echo "     https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
  echo "  2. Add required secrets (SUNO_API_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.)"
  echo "  3. Test your functions"
  echo ""
  echo "To verify deployment:"
  echo "  supabase functions list --project-ref $PROJECT_REF"
  exit 0
fi
