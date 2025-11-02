#!/bin/bash
# ============================================
# Music Generation Data Contract Validator
# ============================================
# Validates parameter consistency across:
# - Frontend validation schemas
# - Backend type definitions
# - Provider adapters
# - Edge function schemas
# ============================================

set -e

echo "🔍 Validating Music Generation Data Contract..."
echo ""

ERRORS=0
WARNINGS=0

# ============================================
# Helper Functions
# ============================================

log_error() {
  echo "❌ ERROR: $1"
  ERRORS=$((ERRORS + 1))
}

log_warning() {
  echo "⚠️  WARNING: $1"
  WARNINGS=$((WARNINGS + 1))
}

log_success() {
  echo "✅ $1"
}

log_info() {
  echo "ℹ️  $1"
}

# ============================================
# 1. Check Required Files Exist
# ============================================

echo "📋 Step 1: Checking required files..."

REQUIRED_FILES=(
  "src/utils/provider-validation.ts"
  "src/services/providers/types.ts"
  "src/services/providers/adapters/suno.adapter.ts"
  "src/services/providers/adapters/mureka.adapter.ts"
  "supabase/functions/_shared/types/generation.ts"
  "supabase/functions/_shared/zod-schemas.ts"
  "supabase/functions/generate-suno/index.ts"
  "supabase/functions/generate-mureka/index.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    log_error "Required file missing: $file"
  else
    log_success "Found: $file"
  fi
done

echo ""

# ============================================
# 2. Validate Parameter Consistency
# ============================================

echo "🔎 Step 2: Validating parameter consistency..."

# Check if styleTags exists in all required files
log_info "Checking 'styleTags' parameter..."

if grep -q "styleTags" src/utils/provider-validation.ts; then
  log_success "'styleTags' found in provider-validation.ts"
else
  log_error "'styleTags' missing in provider-validation.ts"
fi

if grep -q "styleTags" src/services/providers/types.ts; then
  log_success "'styleTags' found in providers/types.ts"
else
  log_error "'styleTags' missing in providers/types.ts"
fi

if grep -q "styleTags" supabase/functions/_shared/types/generation.ts; then
  log_success "'styleTags' found in backend types"
else
  log_error "'styleTags' missing in backend types"
fi

echo ""

# Check Mureka prompt length validation
log_info "Checking Mureka prompt truncation..."

if grep -q "500" supabase/functions/generate-mureka/index.ts; then
  log_success "Mureka prompt truncation logic found"
else
  log_warning "Mureka prompt truncation may be missing"
fi

echo ""

# ============================================
# 3. Check Type Definitions Match
# ============================================

echo "📊 Step 3: Validating type definitions..."

# Extract base parameters from frontend
FRONTEND_BASE_PARAMS=$(grep -A 20 "interface GenerationParams" src/services/providers/types.ts | grep -oP "^\s+\w+" | tr -d ' ' || echo "")

# Extract base parameters from backend
BACKEND_BASE_PARAMS=$(grep -A 20 "interface BaseGenerationParams" supabase/functions/_shared/types/generation.ts | grep -oP "^\s+\w+" | tr -d ' ' || echo "")

log_info "Frontend base parameters: $(echo $FRONTEND_BASE_PARAMS | wc -w)"
log_info "Backend base parameters: $(echo $BACKEND_BASE_PARAMS | wc -w)"

# Check critical parameters exist in both
CRITICAL_PARAMS=("prompt" "title" "lyrics" "styleTags" "hasVocals" "modelVersion")

for param in "${CRITICAL_PARAMS[@]}"; do
  if echo "$FRONTEND_BASE_PARAMS" | grep -q "$param"; then
    FRONTEND_HAS=true
  else
    FRONTEND_HAS=false
  fi
  
  if echo "$BACKEND_BASE_PARAMS" | grep -q "$param"; then
    BACKEND_HAS=true
  else
    BACKEND_HAS=false
  fi
  
  if [ "$FRONTEND_HAS" = true ] && [ "$BACKEND_HAS" = true ]; then
    log_success "Parameter '$param' exists in both frontend and backend"
  elif [ "$FRONTEND_HAS" = false ] && [ "$BACKEND_HAS" = false ]; then
    log_warning "Parameter '$param' missing in both frontend and backend"
  else
    log_error "Parameter '$param' inconsistent between frontend and backend"
  fi
done

echo ""

# ============================================
# 4. Check Provider-Specific Parameters
# ============================================

echo "🎛️  Step 4: Validating provider-specific parameters..."

# Suno-specific
log_info "Checking Suno-specific parameters..."
SUNO_PARAMS=("make_instrumental" "customMode" "negativeTags" "vocalGender" "styleWeight" "audioWeight")

for param in "${SUNO_PARAMS[@]}"; do
  if grep -q "$param" supabase/functions/_shared/types/generation.ts; then
    log_success "Suno parameter '$param' found in backend types"
  else
    log_error "Suno parameter '$param' missing in backend types"
  fi
done

echo ""

# Mureka-specific
log_info "Checking Mureka-specific parameters..."
MUREKA_PARAMS=("isBGM")

for param in "${MUREKA_PARAMS[@]}"; do
  if grep -q "$param" supabase/functions/_shared/types/generation.ts; then
    log_success "Mureka parameter '$param' found in backend types"
  else
    log_error "Mureka parameter '$param' missing in backend types"
  fi
done

echo ""

# ============================================
# 5. Check Error Response Codes
# ============================================

echo "⚠️  Step 5: Validating error response codes..."

ERROR_CODES=("RATE_LIMIT_EXCEEDED" "INSUFFICIENT_CREDITS" "INTERNAL_ERROR")

for code in "${ERROR_CODES[@]}"; do
  if grep -q "$code" src/utils/error-handlers/generation-errors.ts; then
    FRONTEND_HAS_CODE=true
  else
    FRONTEND_HAS_CODE=false
  fi
  
  BACKEND_HAS_CODE=false
  if grep -q "$code" supabase/functions/generate-suno/index.ts || grep -q "$code" supabase/functions/generate-mureka/index.ts; then
    BACKEND_HAS_CODE=true
  fi
  
  if [ "$FRONTEND_HAS_CODE" = true ] && [ "$BACKEND_HAS_CODE" = true ]; then
    log_success "Error code '$code' exists in both frontend and backend"
  else
    log_error "Error code '$code' inconsistent between frontend ($FRONTEND_HAS_CODE) and backend ($BACKEND_HAS_CODE)"
  fi
done

echo ""

# ============================================
# 6. Check Transformation Logic
# ============================================

echo "🔄 Step 6: Validating parameter transformations..."

# Check Suno: styleTags → tags transformation
if grep -q "tags.*styleTags" src/services/providers/adapters/suno.adapter.ts; then
  log_success "Suno adapter has styleTags → tags transformation"
else
  log_error "Suno adapter missing styleTags → tags transformation"
fi

# Check weight clamping in Suno
if grep -q "clampRatio" src/services/providers/adapters/suno.adapter.ts; then
  log_success "Suno adapter has weight clamping logic"
else
  log_warning "Suno adapter may be missing weight clamping"
fi

# Check Mureka prompt truncation
if grep -q "slice.*500" supabase/functions/generate-mureka/index.ts; then
  log_success "Mureka edge function has prompt truncation"
else
  log_error "Mureka edge function missing prompt truncation"
fi

echo ""

# ============================================
# 7. Check Tests Exist
# ============================================

echo "🧪 Step 7: Checking test coverage..."

if [ -f "src/services/generation/__tests__/generate-mureka.test.ts" ]; then
  log_success "Mureka generation tests exist"
else
  log_warning "Mureka generation tests missing"
fi

if [ -f "src/services/providers/adapters/__tests__/suno.adapter.test.ts" ]; then
  log_success "Suno adapter tests exist"
else
  log_warning "Suno adapter tests missing (recommended)"
fi

if [ -f "src/services/providers/adapters/__tests__/mureka.adapter.test.ts" ]; then
  log_success "Mureka adapter tests exist"
else
  log_warning "Mureka adapter tests missing (recommended)"
fi

echo ""

# ============================================
# Final Report
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Report"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "✅ All critical checks passed!"
  echo ""
  echo "Next steps:"
  echo "  1. Review warnings and consider fixing them"
  echo "  2. Add missing unit tests"
  echo "  3. Run end-to-end tests: npm run test:e2e"
  exit 0
else
  echo "❌ Validation failed with $ERRORS error(s)"
  echo ""
  echo "Please fix the errors above and run this script again."
  echo "See docs/generation-system/DATA_CONTRACT.md for details."
  exit 1
fi
