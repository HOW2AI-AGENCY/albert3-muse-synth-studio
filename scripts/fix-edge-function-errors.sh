#!/bin/bash
# Script to fix common TypeScript errors in edge functions

# Fix error.message on unknown type (add type guard)
find supabase/functions -name "*.ts" -type f -exec sed -i 's/error\.message/((error instanceof Error ? error : new Error(String(error))).message)/g' {} \;

# Fix .catch() calls (Supabase queries don't return promises with .catch())
find supabase/functions -name "*.ts" -type f -exec sed -i 's/)\.catch(() => undefined);/);/g' {} \;

echo "Edge function errors fixed"
