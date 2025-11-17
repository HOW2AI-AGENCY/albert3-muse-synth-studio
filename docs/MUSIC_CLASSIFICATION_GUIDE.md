# 🎵 Music Classification Guide

**Version**: 1.0.0  
**Created**: 2025-11-17  
**Status**: Phase 1 Complete - Database Foundation

---

## 📋 Overview

Albert3 Muse Synth Studio integrates two state-of-the-art AI classifiers for comprehensive music analysis:

1. **MTG Music Classifiers** - Transfer learning models for genres, moods, and instruments
2. **Discogs EfficientNet** - Classification by 400 styles from the Discogs taxonomy

---

## ✨ Features

### Current (Phase 1)
- ✅ **Database Schema** - Tables for classifications and jobs
- ✅ **TypeScript Types** - Full type safety with `MusicClassificationMetadata`
- ✅ **RLS Policies** - Secure access control
- ✅ **Cleanup Functions** - Auto-delete old classification jobs (30 days)

### Planned (Phase 2-9)
- ⏳ **Edge Functions** - `classify-music-mtg`, `classify-music-discogs`
- ⏳ **React Hooks** - `useMusicClassification`, `useClassificationStatus`
- ⏳ **UI Components** - Results dialog, style filters, badges
- ⏳ **Auto-Classification** - Trigger on track completion
- ⏳ **Prompt Enhancement** - Use classifications to improve prompts
- ⏳ **Smart Recommendations** - Find similar tracks

---

## 🗂️ Database Schema

### `music_classifications` Table

Stores detailed classification results with confidence scores.

```sql
CREATE TABLE public.music_classifications (
  id UUID PRIMARY KEY,
  track_id UUID REFERENCES tracks(id),
  version_id UUID REFERENCES track_versions(id),
  
  -- Classifier metadata
  classifier_type TEXT CHECK (
    classifier_type IN (
      'mtg-musicnn-msd-2',
      'mtg-vggish-audioset',
      'effnet-discogs'
    )
  ),
  
  -- Primary results
  primary_genre TEXT,
  primary_mood TEXT,
  primary_style TEXT, -- Discogs only
  confidence_score NUMERIC(5,4),
  
  -- Detailed rankings (JSONB)
  genres_ranked JSONB, -- [{ genre, score }, ...]
  moods_ranked JSONB,
  styles_ranked JSONB,
  
  -- Instruments
  instruments_detected TEXT[],
  instruments_ranked JSONB,
  
  -- Embeddings (future ML)
  embeddings JSONB,
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  UNIQUE(track_id, version_id, classifier_type)
);
```

**Key Indexes:**
- `idx_music_classifications_track_id` - Fast track lookups
- `idx_music_classifications_primary_genre` - Genre filtering
- `idx_music_classifications_primary_style` - Style filtering
- `idx_music_classifications_genres_ranked_gin` - JSONB search
- `idx_music_classifications_instruments_gin` - Array search

### `classification_jobs` Table

Tracks background classification tasks (similar to `audio_upscale_jobs`).

```sql
CREATE TABLE public.classification_jobs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  track_id UUID REFERENCES tracks(id),
  version_id UUID REFERENCES track_versions(id),
  
  -- Input
  input_audio_url TEXT NOT NULL,
  classifier_type TEXT CHECK (
    classifier_type IN ('mtg-musicnn', 'mtg-vggish', 'effnet-discogs', 'both')
  ),
  classifier_config JSONB,
  
  -- Replicate tracking
  replicate_prediction_id TEXT,
  
  -- Output
  classification_id UUID REFERENCES music_classifications(id),
  output_visualization_url TEXT, -- Discogs PNG
  raw_output JSONB,
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  retry_count INTEGER CHECK (retry_count <= 3)
);
```

---

## 📊 TypeScript Types

### `MusicClassificationMetadata` Interface

Located in `src/types/track-metadata.ts`:

```typescript
export interface MusicClassificationMetadata {
  classification_job_id?: string;
  auto_classify_on_complete?: boolean;
  
  mtg_musicnn?: {
    primary_genre: string;
    primary_mood: string;
    instruments: string[];
    confidence: number;
    top_genres: Array<{ genre: string; score: number }>;
    top_moods: Array<{ mood: string; score: number }>;
    top_instruments?: Array<{ instrument: string; score: number }>;
    model_version?: string;
    classified_at: string;
  };
  
  effnet_discogs?: {
    primary_style: string;
    parent_genre: string;
    confidence: number;
    top_styles: Array<{ style: string; score: number }>;
    visualization_url?: string;
    model_version?: string;
    classified_at: string;
  };
}
```

### Updated `TrackMetadata`

```typescript
export interface TrackMetadata 
  extends Partial<SunoMetadata>,
          Partial<MurekaMetadata>,
          Partial<AIDescriptionMetadata>,
          Partial<ExtensionMetadata>,
          Partial<AnalysisMetadata>,
          Partial<MusicClassificationMetadata> { // ✅ NEW
  [key: string]: unknown;
}
```

---

## 🔐 Security (RLS Policies)

### `music_classifications`

```sql
-- Users can view own track classifications
CREATE POLICY "Users can view own track classifications"
  ON music_classifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tracks t
    WHERE t.id = track_id AND t.user_id = auth.uid()
  ));

-- System can insert/update classifications
CREATE POLICY "System can insert classifications"
  ON music_classifications FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tracks t
    WHERE t.id = track_id AND t.user_id = auth.uid()
  ));
```

### `classification_jobs`

```sql
-- Users can view own jobs
CREATE POLICY "Users can view own classification jobs"
  ON classification_jobs FOR SELECT
  USING (user_id = auth.uid());

-- Users can create jobs
CREATE POLICY "Users can create classification jobs"
  ON classification_jobs FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

---

## 🧹 Maintenance

### Cleanup Old Jobs

**Function**: `cleanup_old_classification_jobs()`

Automatically removes completed/failed jobs older than 30 days.

```sql
SELECT cleanup_old_classification_jobs();
-- Returns: Number of deleted jobs
```

**Schedule** (recommended):
- Run daily via cron job
- Or weekly via Supabase pg_cron

```sql
-- Example: Daily cleanup at 3 AM
SELECT cron.schedule(
  'cleanup-classification-jobs',
  '0 3 * * *',
  $$SELECT cleanup_old_classification_jobs()$$
);
```

---

## 📈 Data Model Comparison

| Model | Purpose | Output |
|-------|---------|--------|
| **MTG MusiCNN** | Genres, moods, instruments | JSON with top 10 ranked |
| **MTG VGGish** | Alternative audio embeddings | JSON with top 10 ranked |
| **Discogs EfficientNet** | 400 Discogs styles | JSON + PNG visualization |

### MTG MusiCNN Output Example

```json
{
  "primary_genre": "rock",
  "primary_mood": "energetic",
  "confidence": 0.85,
  "top_genres": [
    { "genre": "rock", "score": 0.85 },
    { "genre": "alternative", "score": 0.72 },
    { "genre": "indie", "score": 0.68 }
  ],
  "top_moods": [
    { "mood": "energetic", "score": 0.78 },
    { "mood": "uplifting", "score": 0.65 }
  ],
  "instruments": ["guitar", "drums", "bass"]
}
```

### Discogs EfficientNet Output Example

```json
{
  "primary_style": "Indie Rock",
  "parent_genre": "Rock",
  "confidence": 0.82,
  "top_styles": [
    { "style": "Indie Rock", "score": 0.82 },
    { "style": "Alternative Rock", "score": 0.76 },
    { "style": "Post-Punk", "score": 0.71 }
  ],
  "visualization_url": "https://replicate.delivery/.../out.png"
}
```

---

## 🛠️ Usage Examples (Planned)

### Manual Classification

```typescript
import { useMusicClassification } from '@/hooks/useMusicClassification';

const { classifyMusic, isClassifying } = useMusicClassification();

// Classify with MTG only
await classifyMusic({
  trackId: 'track-uuid',
  classifier: 'mtg-musicnn'
});

// Classify with both
await classifyMusic({
  trackId: 'track-uuid',
  classifier: 'both' // MTG + Discogs
});
```

### Auto-Classification

```typescript
// Enable auto-classification in generator
const params = {
  prompt: "Epic orchestral music",
  autoClassify: true // ✅ Classify after generation
};
```

### Query Classifications

```typescript
import { useTrackClassifications } from '@/hooks/useTrackClassifications';

const { data: classifications } = useTrackClassifications(trackId);

// Access MTG results
const mtg = classifications?.find(c => c.classifier_type === 'mtg-musicnn-msd-2');
console.log(mtg?.primary_genre); // "rock"
console.log(mtg?.instruments_detected); // ["guitar", "drums"]

// Access Discogs results
const discogs = classifications?.find(c => c.classifier_type === 'effnet-discogs');
console.log(discogs?.primary_style); // "Indie Rock"
```

---

## 🔄 Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ **Complete** | Database schema, types, RLS |
| **Phase 2** | ⏳ Planned | Edge Functions |
| **Phase 3** | ⏳ Planned | React Hooks |
| **Phase 4** | ⏳ Planned | UI Components |
| **Phase 5** | ⏳ Planned | Auto-Classification |
| **Phase 6** | ⏳ Planned | Generator Integration |
| **Phase 7** | ⏳ Planned | Testing |
| **Phase 8** | ⏳ Planned | Documentation |
| **Phase 9** | ⏳ Planned | Deployment |

**Next Steps**: Phase 2 - Implement Edge Functions

---

## 📚 References

- **MTG Essentia Models**: [https://essentia.upf.edu/models.html](https://essentia.upf.edu/models.html)
- **Discogs Taxonomy**: [https://blog.discogs.com/en/genres-and-styles/](https://blog.discogs.com/en/genres-and-styles/)
- **Replicate MTG Model**: [mtg/music-classifiers](https://replicate.com/mtg/music-classifiers)
- **Replicate Discogs Model**: [mtg/effnet-discogs](https://replicate.com/mtg/effnet-discogs)

---

## 🐛 Troubleshooting

### Issue: Classification stuck in "processing"

**Cause**: Replicate API timeout or webhook not received.

**Solution**:
1. Check `classification_jobs` table for `replicate_prediction_id`
2. Query Replicate API manually
3. Re-run classification if timeout exceeded 5 minutes

### Issue: Low confidence scores

**Cause**: Poor audio quality, short track, or mixed genre.

**Solution**:
- Ensure track is longer than 30 seconds
- Verify audio quality (bitrate > 128kbps)
- Try both classifiers for cross-validation

### Issue: Missing genre/mood data

**Cause**: Parser failed to extract data from model output.

**Solution**:
- Check `classification_jobs.raw_output` column
- Verify model output format hasn't changed
- Update parser in Edge Function

---

**Last Updated**: 2025-11-17  
**Maintainer**: AI Development Team  
**Version**: 1.0.0