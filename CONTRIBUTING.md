# 🤝 Contributing to Albert3 Muse Synth Studio

Thank you for your interest in contributing to Albert3! This guide will help you get started.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Git
- Basic knowledge of React, TypeScript, and Supabase

### Setup Development Environment

1. **Fork and Clone**
```bash
git clone https://github.com/YOUR_USERNAME/albert3-muse-synth-studio.git
cd albert3-muse-synth-studio
```

2. **Install Dependencies**
```bash
npm install
```

3. **Start Development Server**
```bash
npm run dev
```

4. **Run Tests**
```bash
npm test
```

## 📋 Development Workflow

### Branch Strategy

```
main                 # Production-ready code
develop              # Integration branch
feature/ISSUE-123-*  # New features
bugfix/ISSUE-456-*   # Bug fixes
hotfix/*            # Critical production fixes
refactor/*          # Code refactoring
```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add lyrics generation feature
fix: resolve audio playback issue
docs: update API documentation
test: add unit tests for useTracks
refactor: extract AudioControls component
perf: optimize TracksList rendering
style: update button hover states
chore: upgrade React to 18.3.1
```

**Format**: `<type>(<scope>): <description>`

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `test` - Tests
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `style` - Code style (not CSS)
- `chore` - Maintenance tasks

### Pull Request Process

1. **Create a Branch**
```bash
git checkout -b feature/ISSUE-123-add-feature
```

2. **Make Changes**
- Follow [code style guidelines](#code-style)
- Write tests for new features
- Update documentation

3. **Commit Changes**
```bash
git add .
git commit -m "feat: add new feature"
```

4. **Push to Fork**
```bash
git push origin feature/ISSUE-123-add-feature
```

5. **Open Pull Request**
- Use PR template
- Link related issues
- Add screenshots/GIFs for UI changes
- Wait for review (minimum 1 approval required)

## 📝 Code Style

### TypeScript

```typescript
// ✅ GOOD
const trackDuration = 120;
const isPlaying = false;

function playTrack(trackId: string): void { }

const TrackCard = ({ track }: TrackCardProps) => { };

const API_BASE_URL = 'https://api.example.com';

// ❌ BAD
const TrackDuration = 120;
function PlayTrack(track_id) { }
const track_card = () => { };
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Variables | camelCase | `trackDuration` |
| Functions | camelCase | `playTrack()` |
| Components | PascalCase | `TrackCard` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |
| Hooks | useCamelCase | `useAudioPlayer()` |
| Types/Interfaces | PascalCase | `TrackCardProps` |

### Component Structure

```typescript
// TrackCard.tsx
import React, { memo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Track } from '@/types/track.types';

interface TrackCardProps {
  track: Track;
  onPlay: (id: string) => void;
  isPlaying?: boolean;
}

export const TrackCard = memo<TrackCardProps>(({ 
  track, 
  onPlay, 
  isPlaying = false 
}) => {
  const handlePlay = useCallback(() => {
    onPlay(track.id);
  }, [track.id, onPlay]);

  return (
    <Card onClick={handlePlay}>
      {/* ... */}
    </Card>
  );
});

TrackCard.displayName = 'TrackCard';
```

### File Organization

```
src/components/TrackCard/
├── TrackCard.tsx          # Component
├── TrackCard.test.tsx     # Tests
├── index.ts               # Re-export
```

## 🧪 Testing

### Writing Tests

```typescript
// TrackCard.test.tsx
import { render, screen } from '@testing-library/react';
import { TrackCard } from './TrackCard';

describe('TrackCard', () => {
  it('renders track title', () => {
    const track = { id: '1', title: 'Test Track' };
    render(<TrackCard track={track} onPlay={jest.fn()} />);
    expect(screen.getByText('Test Track')).toBeInTheDocument();
  });

  it('calls onPlay when clicked', () => {
    const onPlay = jest.fn();
    const track = { id: '1', title: 'Test Track' };
    render(<TrackCard track={track} onPlay={onPlay} />);
    screen.getByText('Test Track').click();
    expect(onPlay).toHaveBeenCalledWith('1');
  });
});
```

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## 🎨 CSS Changes Checklist

### Before Modifying CSS Files

⚠️ **CRITICAL**: CSS variables are strictly controlled to prevent duplicates and conflicts.

**Files affected by CSS Variable Contract**:
- `src/index.css` - Base tokens (spacing, colors, fonts)
- `src/styles/design-tokens.css` - Density tokens (compact/comfortable)
- `tailwind.config.ts` - Tailwind configuration

### Step-by-Step Process

1. **Read the Contract**
   ```bash
   cat docs/design-system/CSS_VARIABLE_CONTRACT.md
   ```

2. **Determine Which File to Modify**
   - **Base tokens** (spacing, colors, fonts) → `src/index.css`
   - **Density tokens** (compact/comfortable) → `src/styles/design-tokens.css`
   - **Tailwind utilities** → `tailwind.config.ts` (references only)

3. **Make Changes**
   - Add/modify variables in the appropriate file
   - **NEVER** duplicate variables between files

4. **Validate Locally**
   ```bash
   bash scripts/validate-css-contract.sh
   ```

5. **Test the App**
   - Open `/workspace/generate` route
   - Verify no visual regressions
   - Check browser console for errors

6. **Commit Changes**
   ```bash
   git add .
   git commit -m "style: update spacing tokens"
   # Pre-commit hook will auto-validate
   ```

### Common Pitfalls to Avoid

❌ **WRONG**: Duplicating variables
```css
/* index.css */
--space-4: 1rem;

/* design-tokens.css */
--space-4: 1.2rem; /* ❌ Duplicate! */
```

✅ **CORRECT**: Use separate namespaces
```css
/* index.css */
--space-4: 1rem;

/* design-tokens.css */
--space-compact-md: 0.75rem; /* ✅ Unique namespace */
```

### Validation Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `scripts/validate-css-contract.sh` | Detect duplicates | Before commit |
| `.husky/pre-commit` | Auto-validate | On every commit |
| GitHub Actions | CI validation | On every PR |

### Emergency Fix

If you accidentally broke the CSS contract:

```bash
# 1. Identify duplicates
bash scripts/validate-css-contract.sh

# 2. Remove duplicates from design-tokens.css
# (Keep base tokens only in index.css)

# 3. Verify fix
bash scripts/validate-css-contract.sh

# 4. Test app
npm run dev
# Open /workspace/generate

# 5. Commit fix
git commit -m "fix(css): remove duplicate CSS variables"
```

---

## 🎵 Music Generation System Changes Checklist

### Before Modifying Generation-Related Code

⚠️ **CRITICAL**: The music generation system has a strict data contract between frontend, backend, and providers.

**Files affected by Generation System Contract**:
- `src/utils/provider-validation.ts` - Frontend validation
- `src/services/providers/types.ts` - Frontend types
- `src/services/providers/adapters/*.adapter.ts` - Provider adapters
- `supabase/functions/_shared/types/generation.ts` - Backend types
- `supabase/functions/_shared/zod-schemas.ts` - Backend validation
- `supabase/functions/generate-*/**` - Edge functions

### Step-by-Step Process

1. **Read the Contract**
   ```bash
   cat docs/generation-system/DATA_CONTRACT.md
   ```

2. **Identify the Layer You're Modifying**
   - **Frontend validation** → `src/utils/provider-validation.ts`
   - **Frontend types** → `src/services/providers/types.ts`
   - **Provider adapters** → `src/services/providers/adapters/*.adapter.ts`
   - **Backend types** → `supabase/functions/_shared/types/generation.ts`
   - **Backend validation** → `supabase/functions/_shared/zod-schemas.ts`
   - **Edge functions** → `supabase/functions/generate-*/**`

3. **Update ALL Related Layers**
   
   Example: Adding a new parameter `duration`
   
   ```typescript
   // 1. Frontend validation (provider-validation.ts)
   const baseGenerationSchema = z.object({
     // ... existing params
     duration: z.number().min(30).max(240).optional(),
   });
   
   // 2. Frontend types (providers/types.ts)
   export interface GenerationParams {
     // ... existing params
     duration?: number;
   }
   
   // 3. Backend types (_shared/types/generation.ts)
   export interface BaseGenerationParams {
     // ... existing params
     duration?: number;
   }
   
   // 4. Backend validation (_shared/zod-schemas.ts)
   export const baseGenerationSchema = z.object({
     // ... existing params
     duration: z.number().min(30).max(240).optional(),
   });
   
   // 5. Provider adapters (*.adapter.ts)
   const payload = {
     // ... existing params
     duration: params.duration,
   };
   ```

4. **Check Provider-Specific Constraints**
   - **Suno**: `styleTags` → `tags` transformation required
   - **Mureka**: Prompt max 500 chars (auto-truncated)
   - **Mureka**: Max 1 concurrent generation per user

5. **Validate Locally**
   ```bash
   bash scripts/validate-generation-contract.sh
   ```

6. **Add/Update Tests**
   - Unit tests for adapters
   - Integration tests for full flow
   
   Example test:
   ```typescript
   it('passes new parameter to edge function', async () => {
     const request: GenerationRequest = {
       provider: 'suno',
       prompt: 'Test',
       duration: 120,
     };
     
     await GenerationService.generate(request);
     
     expect(invokeMock).toHaveBeenCalledWith('generate-suno', {
       body: expect.objectContaining({ duration: 120 })
     });
   });
   ```

7. **Test End-to-End**
   - Open `/workspace/generate` route
   - Test Suno generation
   - Test Mureka generation
   - Verify error handling (429, 402, 500)
   - Check console logs for warnings

8. **Update Documentation**
   - Update `DATA_CONTRACT.md` parameter tables
   - Add entries to "Known Issues & Gotchas" if needed
   - Update API documentation if public-facing

### Common Pitfalls to Avoid

❌ **WRONG**: Updating only frontend
```typescript
// Frontend
interface GenerationParams {
  newParam: string;  // Added here
}

// Backend - forgot to add!
// → Runtime error: parameter not recognized
```

✅ **CORRECT**: Update all layers
```typescript
// Frontend validation
newParam: z.string().max(100)

// Frontend types
newParam?: string;

// Backend types
newParam?: string;

// Backend validation
newParam: z.string().max(100).optional()

// Provider adapter
newParam: params.newParam,
```

❌ **WRONG**: Ignoring provider constraints
```typescript
// Sending 3000-char prompt to Mureka
const params = { prompt: longPrompt };  // ❌ Mureka max is 500 chars!
```

✅ **CORRECT**: Respecting provider limits
```typescript
// Mureka adapter automatically truncates
if (params.provider === 'mureka') {
  validatedPrompt = params.prompt.slice(0, 500);
}
```

### Validation Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `scripts/validate-generation-contract.sh` | Detect inconsistencies | Before commit |
| `.husky/pre-commit` | Auto-validate | On every commit |
| GitHub Actions | CI validation | On every PR |

### Emergency Fix

If you accidentally broke the generation system contract:

```bash
# 1. Identify issues
bash scripts/validate-generation-contract.sh

# 2. Check error output
# Common issues:
# - Missing parameter in backend types
# - Missing validation in Zod schemas
# - Missing transformation in adapters

# 3. Fix all layers
# Update all 6 layers mentioned above

# 4. Verify fix
bash scripts/validate-generation-contract.sh

# 5. Test manually
npm run dev
# Go to /workspace/generate
# Try generating music with both Suno and Mureka

# 6. Commit fix
git commit -m "fix(generation): synchronize parameter schemas across layers"
```

---

## 📚 Documentation

### When to Update Documentation

- Adding new features
- Changing API contracts
- Updating configuration
- Fixing bugs that affect usage
- **Modifying CSS variables** (update `CSS_VARIABLE_CONTRACT.md`)

### Where to Add Documentation

- **API Changes**: `docs/api/`
- **Architecture**: `docs/architecture/`
- **User Guide**: `docs/user-guide/`
- **Design System**: `docs/design-system/`
- **Troubleshooting**: `docs/TROUBLESHOOTING.md`

## 🐛 Reporting Bugs

### Before Reporting

1. Check [existing issues](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/issues)
2. Try latest version
3. Review [troubleshooting guide](docs/TROUBLESHOOTING.md)

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
Add screenshots if applicable.

**Environment:**
- OS: [e.g. macOS 12.0]
- Browser: [e.g. Chrome 120]
- Version: [e.g. 3.0.0-alpha.5]

**Additional context**
Any other relevant information.
```

## 💡 Feature Requests

Use the [Feature Request template](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/issues/new?template=feature_request.md) to propose new features.

## 🔍 Code Review Guidelines

### For Authors
- Keep PRs small and focused
- Write clear descriptions
- Add tests
- Update documentation
- Respond to feedback promptly

### For Reviewers
- Be constructive and respectful
- Focus on code quality, not style preferences
- Test the changes locally
- Approve when ready or request changes

## 📞 Getting Help

- **Documentation**: [docs/README.md](docs/README.md)
- **Discord**: [Join our server](https://discord.gg/albert3)
- **Discussions**: [GitHub Discussions](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/discussions)

## 🎖️ Recognition

Contributors are recognized in:
- [GitHub Contributors](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/graphs/contributors)
- Release notes
- Project README

---

Thank you for contributing to Albert3! 🎵
