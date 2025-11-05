/**
 * DAW Page - Digital Audio Workstation
 *
 * This is the main entry point for the DAW editor.
 * It now uses the responsive DAW implementation that automatically
 * switches between desktop and mobile layouts.
 *
 * Features:
 * - Multi-track audio editing
 * - Stem loading and manipulation
 * - Waveform visualization
 * - Timeline with markers and regions
 * - Transport controls
 * - AI generation tools (Suno integration)
 * - Undo/Redo
 * - Keyboard shortcuts
 * - Mobile-optimized interface
 * - Touch gesture support
 *
 * @module pages/workspace/DAW
 */

import React from 'react';
import { DAWResponsive } from './DAWResponsive';

export const DAW: React.FC = () => {
  return <DAWResponsive />;
};
