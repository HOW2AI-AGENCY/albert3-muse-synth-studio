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

### Branch Protection & Required Checks

To maintain repository health and quality, the following protections and checks are required for `main` and `develop`:

- Require pull request before merging (no direct pushes)
- Minimum 1 approval from reviewers
- Status checks must pass before merge:
  - `npm run typecheck` — TypeScript type validation
  - `npm run lint` — ESLint
  - `npm test` — Unit tests with coverage
  - (if applicable) `npx supabase functions test` — Edge Functions
- Require linear history (no merge commits on protected branches)
- Enforce Conventional Commits in PR titles

### Branch Cleanup Policy

After merging a PR:

- Delete the feature/bugfix branch from remote (GitHub UI or CLI)
- Periodically clean up stale branches:
  - Identify merged branches: `git branch -r --merged origin/main`
  - Delete with confirmation following project rules
- Archive large, long‑living branches into `/archive` if needed

See also:
- Repository cleanup checklist: `docs/maintenance/REPO_CLEANUP_CHECKLIST.md`
- Sprint status: `project-management/SPRINT_STATUS.md`

## 📝 Code Style

### Naming Conventions
- **Variables:** `camelCase` - `trackDuration`
- **Functions:** `camelCase` - `playTrack()`
- **Components:** `PascalCase` - `TrackCard`
- **Constants:** `UPPER_SNAKE_CASE` - `API_BASE_URL`
- **Types/Interfaces:** `PascalCase` - `TrackCardProps`
- **Files:** `kebab-case` - `track-card.tsx` OR `PascalCase` - `TrackCard.tsx`

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
const track_card = () => {};
```

### React Components

```typescript
// ✅ GOOD: Memoized functional component
export const TrackCard = React.memo(({ 
  track, 
  onPlay 
}: TrackCardProps) => {
  const handlePlay = useCallback(() => {
    onPlay(track.id);
  }, [track.id, onPlay]);
  
  return (
    <Card>
      <Button onClick={handlePlay}>Play</Button>
    </Card>
  );
});

TrackCard.displayName = 'TrackCard';

// ❌ BAD: Not memoized, no useCallback
export const TrackCard = ({ track, onPlay }) => {
  return (
    <Card>
      <Button onClick={() => onPlay(track.id)}>Play</Button>
    </Card>
  );
};
```

### Design System (CRITICAL!)

```typescript
// ✅ GOOD: Use semantic tokens
<div className="bg-background text-foreground border-border">
  <Button variant="default">Click me</Button>
</div>

// ✅ GOOD: Use HSL from design system
const colors = getCanvasColors();
ctx.fillStyle = colors.background; // HSL value

// ❌ BAD: Direct colors
<div className="bg-white text-black border-gray-300">
  <Button className="bg-blue-500">Click me</Button>
</div>

// ❌ BAD: Direct hex colors
ctx.fillStyle = '#1a1a1a';
```

**Rule:** NEVER use direct colors (white, black, blue-500, etc.). Always use design system tokens!

---

## 🧪 Testing Requirements

### Test Coverage Targets
- **Unit Tests:** 80% (currently 35%)
- **Integration Tests:** 60% (currently 15%)
- **E2E Tests:** 40% (currently 10%)

### Writing Tests

```typescript
// Unit test example
import { renderHook, waitFor } from '@testing-library/react';
import { useTracks } from '../useTracks';

describe('useTracks', () => {
  it('should fetch tracks', async () => {
    const { result } = renderHook(() => useTracks());
    
    await waitFor(() => {
      expect(result.current.tracks).toBeDefined();
      expect(result.current.tracks.length).toBeGreaterThan(0);
    });
  });
  
  it('should handle errors', async () => {
    // Mock error
    mockSupabase.from('tracks').select.mockRejectedValue(new Error('Failed'));
    
    const { result } = renderHook(() => useTracks());
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

### Required Tests for New Features
- [ ] Unit tests (before merge)
- [ ] Integration tests (for complex features)
- [ ] E2E tests (for user-facing features)
- [ ] Performance tests (for optimizations)

---

## 🔒 Security Guidelines

### Edge Functions
```typescript
// ✅ GOOD: Proper auth check
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response('Unauthorized', { status: 401 });
}

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Database Operations
```typescript
// ✅ GOOD: RLS-protected query
const { data, error } = await supabase
  .from('tracks')
  .select('*')
  .eq('user_id', userId);
// RLS automatically filters to user's tracks

// ❌ BAD: Direct SQL without RLS
await supabase.rpc('raw_sql', {
  query: 'SELECT * FROM tracks'
});
```

### Input Validation
```typescript
// ✅ GOOD: Zod validation
import { z } from 'zod';

const schema = z.object({
  prompt: z.string().min(1).max(500),
  tags: z.array(z.string()).optional(),
});

const validated = schema.parse(input);
```

---

## 🚀 Pull Request Requirements

### Checklist (MANDATORY)
- [ ] Code follows style guidelines
- [ ] TypeScript types added/updated
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No console.log in production code
- [ ] Design system tokens used (no direct colors)
- [ ] React.memo applied to components
- [ ] useCallback used for event handlers
- [ ] Performance impact assessed
- [ ] Security implications reviewed

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation
- [ ] Performance improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] All tests passing

## Screenshots (if UI changes)
[Add screenshots or GIFs]

## Checklist
- [ ] Code follows project style
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process
1. **Minimum 1 approval** required
2. **CI checks** must pass:
   - TypeScript compilation
   - ESLint
   - Unit tests
   - Build succeeds
3. **Code quality** standards met
4. **Performance** impact acceptable

---

## 📋 Branch Strategy

### Branch Naming
```
feature/PHASE-8-bulk-operations
bugfix/player-audio-glitch
hotfix/critical-auth-issue
refactor/generator-components
docs/phase-8-guide
test/daw-projects-coverage
```

### Workflow
```bash
# 1. Create branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# 2. Make changes + commit
git add .
git commit -m "feat(bulk): add download operation"

# 3. Push to origin
git push origin feature/my-feature

# 4. Open PR (GitHub UI)
# 5. Address review comments
# 6. Merge (squash + merge)
# 7. Delete branch
```

---

## 🛠️ Common Patterns

### Custom Hook Pattern
```typescript
export function useMyFeature() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-feature'],
    queryFn: fetchData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const { mutateAsync: doAction } = useMutation({
    mutationFn: performAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-feature'] });
      toast.success('Action completed');
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });
  
  return { data, isLoading, error, doAction };
}
```

### Repository Pattern
```typescript
// Interface
interface IMyRepository {
  findAll(): Promise<Item[]>;
  findById(id: string): Promise<Item | null>;
  create(item: Partial<Item>): Promise<Item>;
}

// Implementation
class SupabaseMyRepository implements IMyRepository {
  async findAll() {
    const { data, error } = await supabase
      .from('items')
      .select('*');
    
    if (error) throw error;
    return data;
  }
}
```

---

## 📚 Additional Resources

- [CLAUDE.md](../../CLAUDE.md) - Complete project guide
- [Phase 8 Summary](./PHASE_8_SUMMARY.md) - Phase 8 details
- [Logic Audit](../audit/LOGIC_AUDIT_2025-11-16.md) - Code quality audit
- [Quick Start](./QUICK_START_GUIDE.md) - Fast onboarding
- [Architecture](../architecture/SYSTEM_OVERVIEW.md) - System architecture

---

**Last Updated:** November 16, 2025  
**Version:** 1.0  
**Status:** Active

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

## 📚 Documentation

### When to Update Documentation

- Adding new features
- Changing API contracts
- Updating configuration
- Fixing bugs that affect usage

### Where to Add Documentation

- **API Changes**: `docs/api/`
- **Architecture**: `docs/architecture/`
- **User Guide**: `docs/user-guide/`
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
