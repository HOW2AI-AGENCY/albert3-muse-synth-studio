import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DetailPanelContent } from "../DetailPanelContent";
import type { TrackDensityMode } from "@/features/tracks/ui/density";

vi.mock("@/components/tracks/TrackVersions", () => ({
  TrackVersions: () => <div data-testid="track-versions" />,
}));

vi.mock("@/components/tracks/TrackStemsPanel", () => ({
  TrackStemsPanel: () => <div data-testid="track-stems" />,
}));

vi.mock("@/components/workspace/StyleRecommendationsPanel", () => ({
  StyleRecommendationsPanel: () => <div data-testid="style-recommendations" />,
}));

vi.mock("@/hooks/useTrackLike", () => ({
  useTrackLike: () => ({
    isLiked: false,
    likeCount: 0,
    toggleLike: vi.fn(),
  }),
}));

type DensityExpectation = {
  mode: TrackDensityMode;
  expectedPadding: string;
  expectedIconSize: string;
};

const baseProps = {
  track: {
    id: "track-1",
    title: "Demo Track",
    prompt: "A futuristic synthwave jam",
    status: "completed",
    audio_url: "https://example.com/audio.mp3",
    is_public: true,
    created_at: "2024-01-01T00:00:00.000Z",
    like_count: 2,
    view_count: 42,
    duration_seconds: 180,
    style_tags: ["synthwave", "retro"],
  },
  title: "Demo Track",
  setTitle: vi.fn(),
  genre: "Synthwave",
  setGenre: vi.fn(),
  mood: "Energetic",
  setMood: vi.fn(),
  isPublic: true,
  setIsPublic: vi.fn(),
  isSaving: false,
  versions: [],
  stems: [],
  onSave: vi.fn(),
  onDownload: vi.fn(),
  onShare: vi.fn(),
  onDelete: vi.fn(),
  loadVersionsAndStems: vi.fn(),
};

describe("DetailPanelContent density", () => {
  const expectations: DensityExpectation[] = [
    {
      mode: "compact",
      expectedPadding: "var(--space-3)",
      expectedIconSize: "var(--height-control-sm)",
    },
    {
      mode: "regular",
      expectedPadding: "var(--space-4)",
      expectedIconSize: "var(--height-control-md)",
    },
    {
      mode: "cozy",
      expectedPadding: "var(--space-5)",
      expectedIconSize: "var(--height-control-lg)",
    },
  ];

  expectations.forEach(({ mode, expectedPadding, expectedIconSize }) => {
    it(`applies ${mode} density tokens`, () => {
      render(
        <DetailPanelContent
          {...baseProps}
          densityMode={mode}
        />,
      );

      const panel = screen.getByTestId("detail-panel-content");
      expect(panel).toHaveStyle({
        "--track-density-panel-padding": expectedPadding,
        "--track-density-icon-button-size": expectedIconSize,
      });
    });
  });

  it("defaults to compact density when no mode is provided", () => {
    render(<DetailPanelContent {...baseProps} />);
    const panel = screen.getByTestId("detail-panel-content");

    expect(panel).toHaveStyle({
      "--track-density-panel-padding": "var(--space-3)",
      "--track-density-icon-button-size": "var(--height-control-sm)",
    });
  });
});
