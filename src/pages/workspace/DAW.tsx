/**
 * DAW Page - Digital Audio Workstation
 *
 * This is the main entry point for the DAW editor.
 * It now uses the enhanced DAW implementation with full functionality.
 *
 * Features:
 * - Multi-track audio editing
 * - Stem loading and manipulation
 * - Waveform visualization
 * - Timeline with markers and regions
 * - Transport controls
 * - AI generation tools
 * - Undo/Redo
 * - Keyboard shortcuts
 *
 * @module pages/workspace/DAW
 */

import React from 'react';
import { DAWEnhanced } from './DAWEnhanced';

export const DAW: React.FC = () => {
  return <DAWEnhanced />;
};
