import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const maybeSingle = vi.fn();
  const order = vi.fn(() => ({ limit, maybeSingle }));
  const limit = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return {
    supabase: { from },
    __mock: { from, select, eq, order, limit, maybeSingle },
  };
});

import { getLatestWavJob } from '../../../src/services/wav.service';
const { supabase, __mock: mock } = vi.mocked(await import('../../../src/integrations/supabase/client')) as any;

describe('wav.service.getLatestWavJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает последнюю завершённую задачу с wav_url', async () => {
    mock.maybeSingle.mockResolvedValue({
      data: {
        id: 'job1',
        track_id: 't1',
        status: 'completed',
        wav_url: 'https://example.com/file.wav',
        created_at: '2025-01-01T00:00:00Z',
      },
      error: null,
    });

    const job = await getLatestWavJob('t1');
    expect(job).toBeTruthy();
    expect(job?.status).toBe('completed');
    expect(job?.wav_url).toBe('https://example.com/file.wav');
    expect(mock.from).toHaveBeenCalledWith('wav_jobs');
  });

  it('возвращает null при ошибке запроса', async () => {
    mock.maybeSingle.mockResolvedValue({ data: null, error: new Error('db error') });
    const job = await getLatestWavJob('t2');
    expect(job).toBeNull();
  });
});