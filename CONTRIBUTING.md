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
