/**
 * DAW (Digital Audio Workstation) Store
 *
 * @deprecated This file is deprecated. Use '@/stores/daw' instead.
 * This file now re-exports from the new modular DAW store for backward compatibility.
 *
 * Migration guide:
 * ```ts
 * // Old import
 * import { useDAWStore } from '@/stores/dawStore';
 *
 * // New import (recommended)
 * import { useDAWStore } from '@/stores/daw';
 * ```
 *
 * @module stores/dawStore
 * @since v4.0.0
 * @deprecated v4.1.0 - Use modular store from '@/stores/daw'
 */

// Re-export everything from the new modular store
export * from './daw';
export { useDAWStore as default } from './daw';
