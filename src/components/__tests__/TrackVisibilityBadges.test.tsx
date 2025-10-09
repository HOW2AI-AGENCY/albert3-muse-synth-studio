import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrackCard } from "../TrackCard";
import { TrackListItem } from "../tracks/TrackListItem";

vi.mock("@/hooks/useTrackLike", () => ({
  useTrackLike: () => ({
    isLiked: false,
    likeCount: 0,
    toggleLike: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("Track visibility badges", () => {
  it("renders the public badge on TrackCard when track is public", () => {
    render(
      <TrackCard
        track={{
          id: "track-123",
          title: "Badge Demo",
          status: "completed",
          audio_url: "https://example.com/audio.mp3",
          created_at: "2024-01-01T00:00:00.000Z",
          is_public: true,
        }}
      />,
    );

    expect(screen.getByText("Публичный")).toBeInTheDocument();
  });

  it("does not render the public badge on TrackCard when track is private", () => {
    render(
      <TrackCard
        track={{
          id: "track-456",
          title: "Private Track",
          status: "completed",
          audio_url: "https://example.com/audio.mp3",
          created_at: "2024-01-01T00:00:00.000Z",
          is_public: false,
        }}
      />,
    );

    expect(screen.queryByText("Публичный")).not.toBeInTheDocument();
  });

  it("renders the public badge on TrackListItem when track is public", () => {
    render(
      <TrackListItem
        track={{
          id: "track-789",
          title: "List Badge",
          status: "completed",
          is_public: true,
        }}
      />,
    );

    expect(screen.getByText("Публичный")).toBeInTheDocument();
  });

  it("does not render the public badge on TrackListItem when track is private", () => {
    render(
      <TrackListItem
        track={{
          id: "track-999",
          title: "List Private",
          status: "completed",
          is_public: false,
        }}
      />,
    );

    expect(screen.queryByText("Публичный")).not.toBeInTheDocument();
  });
});
