#!/bin/bash
# ============================================
# CSS Variable Contract Validation Script
# ============================================
# This script validates that CSS variables are not duplicated
# between index.css and design-tokens.css
#
# Usage: bash scripts/validate-css-contract.sh
# Exit codes: 0 = success, 1 = duplicates found

set -e

echo "🔍 Validating CSS Variable Contract..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# File paths
INDEX_CSS="src/index.css"
TOKENS_CSS="src/styles/design-tokens.css"

# Check if files exist
if [ ! -f "$INDEX_CSS" ]; then
  echo "❌ ERROR: $INDEX_CSS not found"
  exit 1
fi

if [ ! -f "$TOKENS_CSS" ]; then
  echo "❌ ERROR: $TOKENS_CSS not found"
  exit 1
fi

echo "📁 Checking files:"
echo "   - $INDEX_CSS"
echo "   - $TOKENS_CSS"
echo ""

# Extract all CSS variable names from index.css
echo "📊 Extracting variables from $INDEX_CSS..."
INDEX_VARS=$(grep -oP '(?<=--)[a-z0-9-]+(?=\s*:)' "$INDEX_CSS" | sort | uniq)
INDEX_COUNT=$(echo "$INDEX_VARS" | wc -l)
echo "   Found $INDEX_COUNT unique variables"

# Extract all CSS variable names from design-tokens.css
echo "📊 Extracting variables from $TOKENS_CSS..."
TOKENS_VARS=$(grep -oP '(?<=--)[a-z0-9-]+(?=\s*:)' "$TOKENS_CSS" | sort | uniq)
TOKENS_COUNT=$(echo "$TOKENS_VARS" | wc -l)
echo "   Found $TOKENS_COUNT unique variables"
echo ""

# Find duplicates
echo "🔍 Searching for duplicates..."
DUPLICATES=$(comm -12 <(echo "$INDEX_VARS") <(echo "$TOKENS_VARS"))

if [ -n "$DUPLICATES" ]; then
  DUPLICATE_COUNT=$(echo "$DUPLICATES" | wc -l)
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ VALIDATION FAILED!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🚨 Found $DUPLICATE_COUNT duplicate CSS variable(s):"
  echo ""
  echo "$DUPLICATES" | while read -r var; do
    echo "   --$var"
  done
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📖 How to Fix:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. Read docs/design-system/CSS_VARIABLE_CONTRACT.md"
  echo "2. Remove duplicate variables from $TOKENS_CSS"
  echo "3. Keep base tokens only in $INDEX_CSS"
  echo "4. Run this script again to verify"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VALIDATION PASSED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ No duplicate CSS variables found"
echo "📝 $INDEX_COUNT variables in $INDEX_CSS"
echo "📝 $TOKENS_COUNT variables in $TOKENS_CSS"
echo ""
echo "✅ CSS Variable Contract is valid"
echo ""

exit 0
