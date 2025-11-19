/**
 * Stem Service
 *
 * Handles audio stem separation operations.
 *
 * @module services/stems/stem.service
 * @since v2.6.3
 */

import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { handleSupabaseFunctionError } from "@/services/api/errors";
import { logWarn } from "@/utils/logger";

/**
 * Stem Service - handles audio stem separation operations
 */
export class StemService {
  /**
   * Request Suno stem job synchronization (fallback polling)
   *
   * @param params - Stem job parameters
   * @returns Promise with success status
   *
   * @example
   * ```typescript
   * const success = await StemService.syncJob({
   *   trackId: 'track-123',
   *   versionId: 'version-456',
   *   separationMode: '4stems'
   * });
   *
   * if (success) {
   *   console.log('Stem job synced successfully');
   * }
   * ```
   */
  static async syncJob(params: {
    trackId: string;
    versionId?: string;
    taskId?: string;
    separationMode?: string;
    forceRefresh?: boolean;
  }): Promise<boolean> {
    const context = "StemService.syncJob";

    const { data, error } = await SupabaseFunctions.invoke<{
      success: boolean;
      status?: string;
      code?: number | null;
      message?: string | null;
    }>("sync-stem-job", {
      body: params,
    });

    if (error) {
      handleSupabaseFunctionError(error, "Failed to synchronise stem job", context, params);
      return false;
    }

    if (!data?.success) {
      logWarn("⚠️ Sync stem job response indicated no success", context, {
        ...params,
        status: data?.status ?? null,
        code: data?.code ?? null,
      });
      return false;
    }

    if (data.code && data.code !== 200) {
      logWarn("⚠️ Sync stem job completed with non-200 Suno code", context, {
        ...params,
        code: data.code,
        message: data.message ?? null,
      });
    }

    return true;
  }
}
