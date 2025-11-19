#!/bin/bash

# Script to replace supabase.functions.invoke with SupabaseFunctions.invoke
# Part of P0 refactoring: Remove monkey-patching

echo "🔧 Replacing supabase.functions.invoke with SupabaseFunctions.invoke..."

# Find all TypeScript files that use supabase.functions.invoke
FILES=$(grep -rl "supabase\.functions\.invoke" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__")

COUNT=0
for file in $FILES; do
  # Skip if file already imports SupabaseFunctions
  if grep -q "import.*SupabaseFunctions.*from.*@/integrations/supabase/functions" "$file"; then
    echo "  ✓ $file (already updated)"
    continue
  fi

  # Check if file uses supabase.functions.invoke
  if grep -q "supabase\.functions\.invoke" "$file"; then
    echo "  📝 Updating $file..."

    # Add import statement after supabase client import
    sed -i '/import.*supabase.*from.*@\/integrations\/supabase\/client/a\
import { SupabaseFunctions } from "@/integrations/supabase/functions";' "$file"

    # Replace supabase.functions.invoke with SupabaseFunctions.invoke
    sed -i 's/supabase\.functions\.invoke/SupabaseFunctions.invoke/g' "$file"

    ((COUNT++))
  fi
done

echo "✅ Updated $COUNT files"
echo ""
echo "Files that still need manual review (test files):"
grep -rl "supabase\.functions\.invoke" src/ --include="*.test.ts" --include="*.test.tsx" | head -10
