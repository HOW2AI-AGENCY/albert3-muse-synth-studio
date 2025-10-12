/**
 * Base Provider Interface
 * Abstract interface that all provider adapters must implement
 */

import {
  GenerationParams,
  ExtensionParams,
  StemSeparationParams,
  GenerationResult,
  TaskStatus,
  BalanceInfo,
} from './types';

export interface IProviderClient {
  /**
   * Generate new music track
   */
  generateMusic(params: GenerationParams): Promise<GenerationResult>;

  /**
   * Extend existing track
   */
  extendTrack(params: ExtensionParams): Promise<GenerationResult>;

  /**
   * Separate track into stems
   */
  separateStems?(params: StemSeparationParams): Promise<GenerationResult>;

  /**
   * Query task status
   */
  queryTask(taskId: string): Promise<TaskStatus>;

  /**
   * Get provider balance
   */
  getBalance(): Promise<BalanceInfo>;
}
