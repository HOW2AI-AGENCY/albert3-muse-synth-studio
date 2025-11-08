import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { parseStoragePath, decideCleanup, type TrackStatusInfo, type CleanupReason } from "../_shared/storage-cleanup.ts";

interface CleanupOptions {
  retentionDays?: number;       // Общий срок хранения
  failedRetentionDays?: number; // Срок хранения для failed-треков
  dryRun?: boolean;             // Только план, без удаления
  maxDeletesPerRun?: number;    // Ограничение на количество удалений за запуск
}

interface DeleteOp {
  bucket: string;
  path: string;
  reason: CleanupReason;
}

async function listRecursive(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  bucket: string,
  basePath = ''
): Promise<{ name: string; id?: string; updated_at?: string; metadata?: Record<string, unknown> }[]> {
  const results: { name: string; id?: string; updated_at?: string }[] = [];
  const stack: string[] = [basePath];

  while (stack.length) {
    const current = stack.pop() as string;
    let offset = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(current, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) {
        logger.error('[STORAGE] List error', { bucket, path: current, error });
        break;
      }
      const items = data || [];
      for (const entry of items) {
        const fullPath = current ? `${current}/${entry.name}` : entry.name;
        const isFile = !!(entry as any).updated_at || (entry as any).id;
        if (isFile) {
          results.push({ name: fullPath, updated_at: (entry as any).updated_at });
        } else {
          stack.push(fullPath);
        }
      }
      if (items.length < limit) break;
      offset += limit;
    }
  }

  return results;
}

async function buildTrackStatusMap(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  trackIds: string[]
): Promise<Record<string, TrackStatusInfo>> {
  const unique = Array.from(new Set(trackIds));
  if (unique.length === 0) return {};

  const { data, error } = await supabase
    .from('tracks')
    .select('id, status')
    .in('id', unique);

  if (error) {
    logger.error('[STORAGE] Failed to fetch tracks for status map', { error, count: unique.length });
    return Object.fromEntries(unique.map(id => [id, { exists: false }]));
  }

  const map: Record<string, TrackStatusInfo> = Object.fromEntries(unique.map(id => [id, { exists: false }]));
  for (const row of data || []) {
    map[row.id] = {
      exists: true,
      status: (row as any).status,
      deletedAt: null,
    };
  }
  return map;
}

async function planCleanup(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  buckets: string[],
  options: CleanupOptions
): Promise<DeleteOp[]> {
  const now = new Date();
  const retentionDays = options.retentionDays ?? 90;
  const failedRetentionDays = options.failedRetentionDays ?? 7;

  const allFiles: { bucket: string; path: string; updated_at?: string }[] = [];
  for (const bucket of buckets) {
    const files = await listRecursive(supabase, bucket, '');
    for (const f of files) {
      allFiles.push({ bucket, path: f.name, updated_at: f.updated_at });
    }
  }

  const trackIds: string[] = [];
  const parsed: { bucket: string; path: string; parsed: ReturnType<typeof parseStoragePath>; updated_at?: string }[] = [];
  for (const f of allFiles) {
    const info = parseStoragePath(f.path);
    parsed.push({ bucket: f.bucket, path: f.path, parsed: info, updated_at: f.updated_at });
    if (info?.trackId) trackIds.push(info.trackId);
  }

  const statusMap = await buildTrackStatusMap(supabase, trackIds);

  const deleteOps: DeleteOp[] = [];
  for (const f of parsed) {
    if (!f.parsed) continue;
    const track = statusMap[f.parsed.trackId] ?? { exists: false };
    const decision = decideCleanup(f.updated_at || now.toISOString(), now, retentionDays, track, failedRetentionDays);
    if (decision.delete) {
      deleteOps.push({ bucket: f.bucket, path: f.path, reason: decision.reason! });
    }
  }

  // Ограничим количество удалений за один прогон
  const maxDeletes = options.maxDeletesPerRun ?? 500;
  return deleteOps.slice(0, maxDeletes);
}

async function executeDeletes(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  ops: DeleteOp[]
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;

  // Группируем по бакетам для пакетного удаления
  const byBucket: Record<string, string[]> = {};
  for (const op of ops) {
    byBucket[op.bucket] ||= [];
    byBucket[op.bucket].push(op.path);
  }

  for (const [bucket, paths] of Object.entries(byBucket)) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      logger.error('[STORAGE] Remove error', { bucket, error, count: paths.length });
      errors += paths.length;
    } else {
      logger.info('[STORAGE] Removed files', { bucket, count: paths.length });
      deleted += paths.length;
    }
  }

  return { deleted, errors };
}

serve(async (req: Request) => {
  const corsHeaders = createCorsHeaders(req);

  if (handleCorsPreflightRequest(req)) {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();
  try {
    const supabase = createSupabaseAdminClient();

    const defaultOptions: CleanupOptions = {
      retentionDays: 90,
      failedRetentionDays: 7,
      dryRun: true,
      maxDeletesPerRun: 500,
    };

    const payload = (await req.json().catch(() => ({}))) as Partial<CleanupOptions>;
    const options: CleanupOptions = { ...defaultOptions, ...payload };

    const buckets = ['tracks-audio', 'tracks-covers', 'tracks-videos'];

    logger.info('[STORAGE] Cleanup planning started', { options });
    const plan = await planCleanup(supabase, buckets, options);

    logger.info('[STORAGE] Cleanup plan ready', { totalCandidates: plan.length });

    let result = { deleted: 0, errors: 0 };
    if (!options.dryRun) {
      result = await executeDeletes(supabase, plan);
    }

    const durationMs = Date.now() - start;
    const response = {
      status: options.dryRun ? 'planned' : 'executed',
      durationMs,
      candidates: plan.length,
      deleted: result.deleted,
      errors: result.errors,
      sample: plan.slice(0, 10),
    };

    logger.info('[STORAGE] Cleanup completed', response);

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...createSecurityHeaders() },
    });
  } catch (error) {
    logger.error('[STORAGE] Cleanup failed', { error });
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});