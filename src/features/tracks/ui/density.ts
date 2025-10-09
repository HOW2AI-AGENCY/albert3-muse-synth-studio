import type { CSSProperties } from "react";

export type TrackDensityMode = "compact" | "regular" | "cozy";

export const TRACK_DENSITY_MODES: readonly TrackDensityMode[] = [
  "compact",
  "regular",
  "cozy",
] as const;

interface TrackDensityTokens {
  panelPadding: string;
  sectionGap: string;
  sectionPaddingInline: string;
  sectionPaddingBlock: string;
  sectionRadius: string;
  actionGap: string;
  iconButtonSize: string;
  iconSize: string;
  controlHeight: string;
  fieldGap: string;
  fontSizeClass: string;
  labelSizeClass: string;
  badgePadding: string;
}

const densityTokens: Record<TrackDensityMode, TrackDensityTokens> = {
  compact: {
    panelPadding: "var(--space-3)",
    sectionGap: "var(--space-3)",
    sectionPaddingInline: "var(--space-3)",
    sectionPaddingBlock: "var(--space-2)",
    sectionRadius: "var(--radius-lg)",
    actionGap: "var(--space-2)",
    iconButtonSize: "var(--height-control-sm)",
    iconSize: "1.125rem",
    controlHeight: "var(--height-control-sm)",
    fieldGap: "var(--space-2)",
    fontSizeClass: "text-sm",
    labelSizeClass: "text-xs",
    badgePadding: "0.125rem 0.5rem",
  },
  regular: {
    panelPadding: "var(--space-4)",
    sectionGap: "var(--space-4)",
    sectionPaddingInline: "var(--space-4)",
    sectionPaddingBlock: "var(--space-3)",
    sectionRadius: "var(--radius-xl)",
    actionGap: "var(--space-3)",
    iconButtonSize: "var(--height-control-md)",
    iconSize: "1.25rem",
    controlHeight: "var(--height-control-md)",
    fieldGap: "var(--space-3)",
    fontSizeClass: "text-base",
    labelSizeClass: "text-sm",
    badgePadding: "0.2rem 0.625rem",
  },
  cozy: {
    panelPadding: "var(--space-5)",
    sectionGap: "var(--space-5)",
    sectionPaddingInline: "var(--space-5)",
    sectionPaddingBlock: "var(--space-4)",
    sectionRadius: "var(--radius-2xl)",
    actionGap: "var(--space-4)",
    iconButtonSize: "var(--height-control-lg)",
    iconSize: "1.5rem",
    controlHeight: "var(--height-control-lg)",
    fieldGap: "var(--space-4)",
    fontSizeClass: "text-lg",
    labelSizeClass: "text-base",
    badgePadding: "0.25rem 0.75rem",
  },
};

export const getTrackDensityTokens = (mode: TrackDensityMode = "regular") => densityTokens[mode];

export const createTrackDensityVars = (mode: TrackDensityMode): CSSProperties => {
  const tokens = getTrackDensityTokens(mode);

  return {
    "--track-density-panel-padding": tokens.panelPadding,
    "--track-density-section-gap": tokens.sectionGap,
    "--track-density-section-padding-inline": tokens.sectionPaddingInline,
    "--track-density-section-padding-block": tokens.sectionPaddingBlock,
    "--track-density-section-radius": tokens.sectionRadius,
    "--track-density-action-gap": tokens.actionGap,
    "--track-density-icon-button-size": tokens.iconButtonSize,
    "--track-density-icon-size": tokens.iconSize,
    "--track-density-control-height": tokens.controlHeight,
    "--track-density-field-gap": tokens.fieldGap,
    "--track-density-badge-padding": tokens.badgePadding,
  } as CSSProperties;
};

export const getTrackDensityClasses = (mode: TrackDensityMode) => {
  const tokens = getTrackDensityTokens(mode);
  return {
    fontSizeClass: tokens.fontSizeClass,
    labelSizeClass: tokens.labelSizeClass,
  };
};
