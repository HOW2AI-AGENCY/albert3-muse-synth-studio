# 👨‍💻 Phase 8 Developer Guide - DAW & Bulk Operations

**Comprehensive guide for working with Phase 8 features**

---

## Table of Contents
1. [Overview](#overview)
2. [Bulk Operations](#bulk-operations)
3. [DAW Project Storage](#daw-project-storage)
4. [DAW Color System](#daw-color-system)
5. [API Reference](#api-reference)
6. [Examples](#examples)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Phase 8 introduces three major features:
1. **Bulk Operations** - Perform actions on multiple tracks
2. **DAW Project Storage** - Persistent DAW projects with auto-save
3. **DAW Color System** - Centralized canvas color management

**Status:** 60% Complete (UI Integration in progress)

---

## Bulk Operations

### Architecture

```typescript
// src/utils/bulkOperations.ts

export interface BulkOperationResult {
  successful: string[];
  failed: { id: string; error: string }[];
  totalProcessed: number;
}

export interface ProgressUpdate {
  completed: number;
  total: number;
  currentItem?: string;
}
```

### Available Operations

#### 1. Bulk Delete
```typescript
import { bulkDeleteTracks } from '@/utils/bulkOperations';

async function handleBulkDelete(trackIds: string[]) {
  const result = await bulkDeleteTracks(trackIds, (progress) => {
    console.log(`Deleted ${progress.completed}/${progress.total}`);
  });
  
  if (result.failed.length > 0) {
    console.error('Failed to delete:', result.failed);
  }
}
```

**Key Features:**
- Individual error handling (continues on failure)
- Progress tracking
- Database cleanup (RLS-protected)

#### 2. Bulk Download
```typescript
import { bulkDownloadTracks } from '@/utils/bulkOperations';

async function handleBulkDownload(tracks: Track[]) {
  const result = await bulkDownloadTracks(tracks, (progress) => {
    // Update progress UI
    setProgress(progress);
  });
  
  toast.success(`Downloaded ${result.successful.length} tracks`);
}
```

**Key Features:**
- Sequential downloads (prevents rate limiting)
- Browser-native download API
- Proper error handling for missing URLs

**Limitations:**
- Sequential download can be slow for many files
- No stream-based download (yet)

#### 3. Bulk Add to Project
```typescript
import { bulkAddToProject } from '@/utils/bulkOperations';

async function handleBulkAddToProject(trackIds: string[], projectId: string) {
  // Validate project exists
  const { data: project } = await supabase
    .from('music_projects')
    .select('id')
    .eq('id', projectId)
    .single();
  
  if (!project) {
    toast.error('Project not found');
    return;
  }
  
  const result = await bulkAddToProject(trackIds, projectId, onProgress);
  
  toast.success(`Added ${result.successful.length} tracks to project`);
}
```

**Key Features:**
- Project validation
- Duplicate prevention
- Position assignment

#### 4. Bulk Play
```typescript
import { bulkPlayTracks } from '@/utils/bulkOperations';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';

async function handleBulkPlay(tracks: Track[]) {
  const setQueue = useAudioPlayerStore.getState().setQueue;
  const play = useAudioPlayerStore.getState().play;
  
  const result = await bulkPlayTracks(tracks, (progress) => {
    // Progress tracking
  });
  
  // Queue created, start playing first track
  play();
}
```

**Key Features:**
- Queue creation
- Audio player integration
- Invalid track filtering

#### 5. Bulk Share
```typescript
import { bulkShareTracks } from '@/utils/bulkOperations';

async function handleBulkShare(tracks: Track[]) {
  const result = await bulkShareTracks(tracks);
  
  if (result.successful.length > 0) {
    toast.success('Share URLs copied to clipboard');
  }
}
```

**Key Features:**
- Share URL generation
- Clipboard API integration
- Fallback for unsupported browsers

---

## DAW Project Storage

### Database Schema

```sql
CREATE TABLE daw_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  bpm INTEGER DEFAULT 120,
  duration_seconds INTEGER,
  track_count INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  last_saved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies:**
- Users can only see their own projects
- Public projects visible to everyone
- Admins can see all projects

### Hooks

#### useDAWProjects
```typescript
import { useDAWProjects } from '@/hooks/useDAWProjects';

function MyComponent() {
  const { 
    projects,      // All user's projects
    isLoading,     // Loading state
    saveProject,   // Save/update project
    loadProject,   // Load project data
    deleteProject  // Delete project
  } = useDAWProjects();
  
  // Save project
  const handleSave = async () => {
    await saveProject({
      projectId: 'uuid-here',
      data: {
        name: 'My Project',
        bpm: 140,
        regions: [...],
        tracks: [...],
        metadata: {},
      },
    });
  };
  
  // Load project
  const handleLoad = async (projectId: string) => {
    const project = await loadProject(projectId);
    // Apply to DAW state
    setDawState(project.data);
  };
  
  return (
    <div>
      {projects.map(p => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}
```

**Features:**
- React Query caching
- Optimistic updates
- Toast notifications
- Error handling

#### useDAWAutoSave
```typescript
import { useDAWAutoSave } from '@/hooks/useDAWAutoSave';
import { useDebounce } from 'use-debounce';

function DAWEditor() {
  const [dawState, setDawState] = useState<DAWState | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // Auto-save every 2 seconds (debounced)
  useDAWAutoSave(dawState, projectId, 2000);
  
  return <div>DAW Editor</div>;
}
```

**How it works:**
1. `useDebounce` debounces state changes (2s delay)
2. When debounced state updates, `useEffect` triggers
3. `saveProject` mutation called automatically
4. User sees "Auto-saved" toast notification

**Configuration:**
```typescript
// Default: 2000ms (2 seconds)
useDAWAutoSave(dawState, projectId, 2000);

// Faster auto-save: 1000ms (1 second)
useDAWAutoSave(dawState, projectId, 1000);

// Slower auto-save: 5000ms (5 seconds)
useDAWAutoSave(dawState, projectId, 5000);
```

### Best Practices

1. **Always check projectId before auto-save**
```typescript
useDAWAutoSave(dawState, projectId, 2000);
// If projectId is null, auto-save won't trigger
```

2. **Handle save errors**
```typescript
const { saveProject } = useDAWProjects();

try {
  await saveProject({ projectId, data });
} catch (error) {
  console.error('Save failed:', error);
  // Show error UI
}
```

3. **Validate data before save**
```typescript
const data = {
  name: dawState.projectName || 'Untitled',
  bpm: dawState.bpm || 120,
  regions: dawState.regions || [],
  tracks: dawState.tracks || [],
};

// Check data size (10 MB limit for JSONB)
const dataSize = new Blob([JSON.stringify(data)]).size;
if (dataSize > 10 * 1024 * 1024) {
  toast.error('Project too large to save');
  return;
}
```

---

## DAW Color System

### Usage

```typescript
import { getCanvasColors } from '@/utils/dawColors';

function WaveformCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get colors (automatically detects light/dark mode)
    const colors = getCanvasColors();
    
    // Draw background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw waveform
    ctx.strokeStyle = colors.waveform;
    ctx.lineWidth = 2;
    // ... draw waveform
    
    // Draw playhead
    ctx.strokeStyle = colors.playhead;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, canvas.height);
    ctx.stroke();
  }, []);
  
  return <canvas ref={canvasRef} />;
}
```

### Available Colors

```typescript
interface CanvasColors {
  background: string;         // Canvas background
  grid: string;              // Grid lines
  gridMajor: string;         // Major grid lines (beats)
  waveform: string;          // Waveform color
  waveformInactive: string;  // Inactive waveform
  playhead: string;          // Playhead line
  selection: string;         // Selection highlight
  cursor: string;            // Cursor
  text: string;              // Text labels
  textMuted: string;         // Muted text
  border: string;            // Borders
}
```

### Theming

Colors automatically adapt to light/dark mode:

```typescript
const isDark = document.documentElement.classList.contains('dark');

return {
  background: isDark ? 'hsl(var(--background))' : 'hsl(var(--background))',
  grid: isDark ? 'hsla(var(--foreground) / 0.1)' : 'hsla(var(--foreground) / 0.15)',
  waveform: 'hsl(var(--primary))',
  playhead: 'hsl(var(--destructive))',
  // ...
};
```

**Important:** Always use HSL color tokens from design system!

---

## API Reference

### bulkOperations.ts

```typescript
// Bulk delete tracks
export async function bulkDeleteTracks(
  trackIds: string[],
  onProgress?: (progress: ProgressUpdate) => void
): Promise<BulkOperationResult>

// Bulk download tracks
export async function bulkDownloadTracks(
  tracks: Track[],
  onProgress?: (progress: ProgressUpdate) => void
): Promise<BulkOperationResult>

// Bulk add to project
export async function bulkAddToProject(
  trackIds: string[],
  projectId: string,
  onProgress?: (progress: ProgressUpdate) => void
): Promise<BulkOperationResult>

// Bulk play tracks
export async function bulkPlayTracks(
  tracks: Track[],
  onProgress?: (progress: ProgressUpdate) => void
): Promise<BulkOperationResult>

// Bulk share tracks
export async function bulkShareTracks(
  tracks: Track[]
): Promise<BulkOperationResult>
```

### useDAWProjects

```typescript
interface UseDAWProjectsReturn {
  projects: DAWProject[];
  isLoading: boolean;
  saveProject: (params: SaveProjectParams) => Promise<DAWProject>;
  loadProject: (projectId: string) => Promise<DAWProject>;
  deleteProject: (projectId: string) => Promise<void>;
}

interface SaveProjectParams {
  projectId: string;
  data: {
    name: string;
    bpm?: number;
    regions?: any[];
    tracks?: any[];
    metadata?: Record<string, any>;
  };
}
```

### useDAWAutoSave

```typescript
function useDAWAutoSave(
  dawState: DAWState | null,
  projectId: string | null,
  delay?: number // Default: 2000ms
): void
```

---

## Examples

### Example 1: Bulk Selection + Delete
```typescript
function TracksList() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  
  const handleBulkDelete = async () => {
    setShowProgress(true);
    
    const result = await bulkDeleteTracks(
      Array.from(selectedIds),
      (prog) => setProgress(prog)
    );
    
    setShowProgress(false);
    
    if (result.failed.length > 0) {
      toast.error(`Failed to delete ${result.failed.length} tracks`);
    } else {
      toast.success(`Deleted ${result.successful.length} tracks`);
    }
    
    setSelectedIds(new Set());
  };
  
  return (
    <div>
      {tracks.map(track => (
        <TrackCard 
          key={track.id}
          track={track}
          selected={selectedIds.has(track.id)}
          onSelect={(id) => {
            const newSelected = new Set(selectedIds);
            if (newSelected.has(id)) {
              newSelected.delete(id);
            } else {
              newSelected.add(id);
            }
            setSelectedIds(newSelected);
          }}
        />
      ))}
      
      {selectedIds.size > 0 && (
        <BulkActionToolbar
          count={selectedIds.size}
          onDelete={handleBulkDelete}
        />
      )}
      
      {showProgress && (
        <BulkOperationProgress
          operation="delete"
          {...progress}
        />
      )}
    </div>
  );
}
```

### Example 2: DAW Project with Auto-Save
```typescript
function DAWEditorPage() {
  const [dawState, setDawState] = useState<DAWState | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const { saveProject, loadProject } = useDAWProjects();
  
  // Auto-save every 2 seconds
  useDAWAutoSave(dawState, projectId, 2000);
  
  const handleNewProject = () => {
    const newProjectId = crypto.randomUUID();
    setProjectId(newProjectId);
    setDawState({
      projectName: 'Untitled Project',
      bpm: 120,
      regions: [],
      tracks: [],
      metadata: {},
    });
  };
  
  const handleLoadProject = async (id: string) => {
    const project = await loadProject(id);
    setProjectId(project.id);
    setDawState(project.data as DAWState);
  };
  
  const handleManualSave = async () => {
    if (!projectId || !dawState) return;
    
    await saveProject({
      projectId,
      data: {
        name: dawState.projectName,
        bpm: dawState.bpm,
        regions: dawState.regions,
        tracks: dawState.tracks,
        metadata: dawState.metadata,
      },
    });
    
    toast.success('Project saved manually');
  };
  
  return (
    <div>
      <DAWToolbar
        onNew={handleNewProject}
        onLoad={handleLoadProject}
        onSave={handleManualSave}
      />
      
      <DAWTimeline state={dawState} onChange={setDawState} />
      <DAWTrackList state={dawState} onChange={setDawState} />
    </div>
  );
}
```

---

## Testing

### Unit Tests

```typescript
// src/utils/__tests__/bulkOperations.test.ts
import { bulkDeleteTracks } from '../bulkOperations';

describe('bulkDeleteTracks', () => {
  it('should delete all tracks successfully', async () => {
    const trackIds = ['id1', 'id2', 'id3'];
    const result = await bulkDeleteTracks(trackIds);
    
    expect(result.successful).toHaveLength(3);
    expect(result.failed).toHaveLength(0);
  });
  
  it('should handle partial failures', async () => {
    const trackIds = ['valid-id', 'invalid-id'];
    const result = await bulkDeleteTracks(trackIds);
    
    expect(result.successful).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
  });
});
```

### Integration Tests

```typescript
// src/hooks/__tests__/useDAWProjects.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useDAWProjects } from '../useDAWProjects';

describe('useDAWProjects', () => {
  it('should fetch projects', async () => {
    const { result } = renderHook(() => useDAWProjects());
    
    await waitFor(() => {
      expect(result.current.projects).toBeDefined();
    });
  });
  
  it('should save project', async () => {
    const { result } = renderHook(() => useDAWProjects());
    
    const project = await result.current.saveProject({
      projectId: 'test-id',
      data: {
        name: 'Test Project',
        bpm: 120,
      },
    });
    
    expect(project.id).toBe('test-id');
  });
});
```

---

## Troubleshooting

### Issue: Auto-save not working

**Problem:** DAW project not auto-saving

**Solutions:**
1. Check projectId is not null
```typescript
console.log('ProjectId:', projectId); // Should not be null
```

2. Check dawState is updating
```typescript
useEffect(() => {
  console.log('DAW state changed:', dawState);
}, [dawState]);
```

3. Check debounce delay
```typescript
// Try shorter delay for testing
useDAWAutoSave(dawState, projectId, 500); // 0.5s
```

### Issue: Bulk operation fails silently

**Problem:** Bulk operation completes but some items failed

**Solutions:**
1. Check failed array
```typescript
const result = await bulkDeleteTracks(trackIds);
console.log('Failed:', result.failed);
```

2. Check individual errors
```typescript
result.failed.forEach(({ id, error }) => {
  console.error(`Track ${id} failed:`, error);
});
```

3. Add retry logic
```typescript
// Retry failed items
if (result.failed.length > 0) {
  const retryIds = result.failed.map(f => f.id);
  const retryResult = await bulkDeleteTracks(retryIds);
  // ...
}
```

### Issue: Canvas colors not updating on theme change

**Problem:** DAW canvas doesn't reflect light/dark mode change

**Solutions:**
1. Re-render canvas on theme change
```typescript
const { theme } = useTheme();

useEffect(() => {
  // Redraw canvas when theme changes
  drawCanvas();
}, [theme]);
```

2. Use MutationObserver
```typescript
useEffect(() => {
  const observer = new MutationObserver(() => {
    // Theme changed, redraw
    drawCanvas();
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  
  return () => observer.disconnect();
}, []);
```

---

## Next Steps

1. Complete Phase 8.4 (DAW UI Integration)
2. Implement Phase 8.5 (Advanced Bulk Operations)
3. Write comprehensive tests
4. Performance optimization

**See also:**
- [Phase 8 Summary](./PHASE_8_SUMMARY.md)
- [Sprint 35 Plan](../../project-management/sprints/SPRINT_35_PHASE_8_COMPLETION.md)
- [Logic Audit](../audit/LOGIC_AUDIT_2025-11-16.md)

---

**Happy coding! 🚀**
