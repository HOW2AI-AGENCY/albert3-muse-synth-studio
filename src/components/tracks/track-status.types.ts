/**
 * Track status type used across track-related components and utilities.
 * Extracted to a separate file to comply with Fast Refresh rules
 * (React files should export only components).
 */

export type TrackStatus =
  | 'pending'
  | 'draft'
  | 'processing'
  | 'completed'
  | 'failed';