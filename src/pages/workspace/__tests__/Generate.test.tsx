import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import Generate from "../Generate";
import type { Track } from "@/services/api.service";

const refreshTracksMock = vi.fn();
const deleteTrackMock = vi.fn();

type UseTracksReturn = {
  tracks: Track[];
  isLoading: boolean;
  deleteTrack: typeof deleteTrackMock;
  refreshTracks: typeof refreshTracksMock;
};

let useTracksReturn: UseTracksReturn = {
  tracks: [],
  isLoading: false,
  deleteTrack: deleteTrackMock,
  refreshTracks: refreshTracksMock,
};

vi.mock("@/hooks/useTracks", () => ({
  useTracks: () => useTracksReturn,
}));

vi.mock("@/components/LazyComponents", () => ({
  MusicGeneratorLazy: ({ onTrackGenerated }: { onTrackGenerated?: () => void }) => (
    <button data-testid="start-generation" onClick={() => onTrackGenerated?.()}>
      Generate
    </button>
  ),
  TracksListLazy: ({ tracks }: { tracks: Track[] }) => (
    <div data-testid="tracks-list">{tracks.length}</div>
  ),
  DetailPanelLazy: ({ track }: { track: Track | null }) => (
    <div data-testid="detail-panel">{track ? track.title : null}</div>
  ),
}));

vi.mock("@/hooks/useTrackSync", () => ({
  useTrackSync: vi.fn(),
}));

vi.mock("@/hooks/useTrackRecovery", () => ({
  useTrackRecovery: vi.fn(),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("@/contexts/AudioPlayerContext", () => ({
  useAudioPlayer: () => ({ currentTrack: null }),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DrawerContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DrawerTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ ...props }) => <div data-testid="polling-skeleton" {...props} />,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  },
}));

describe("Generate polling interval", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refreshTracksMock.mockReset();
    deleteTrackMock.mockReset();
    useTracksReturn = {
      tracks: [],
      isLoading: false,
      deleteTrack: deleteTrackMock,
      refreshTracks: refreshTracksMock,
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("clears the polling interval when a new track appears", async () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    const { rerender } = render(<Generate />);

    fireEvent.click(screen.getByTestId("start-generation"));

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId("polling-skeleton")).toBeInTheDocument();

    vi.advanceTimersByTime(2500);
    expect(refreshTracksMock).toHaveBeenCalledTimes(1);

    const newTrack: Track = {
      id: "track-1",
      title: "New Track",
      audio_url: null,
      status: "pending",
      created_at: new Date().toISOString(),
      prompt: "Prompt",
      improved_prompt: null,
      duration: null,
      duration_seconds: null,
      error_message: null,
      cover_url: null,
      video_url: null,
      suno_id: null,
      model_name: null,
      created_at_suno: null,
      lyrics: null,
      style_tags: null,
      has_vocals: null,
      provider: null,
    };

    await act(async () => {
      useTracksReturn = {
        ...useTracksReturn,
        tracks: [newTrack],
      };

      rerender(<Generate />);
    });

    expect(screen.getByTestId("tracks-list").textContent).toBe("1");

    expect(screen.queryByTestId("polling-skeleton")).not.toBeInTheDocument();

    refreshTracksMock.mockClear();
    vi.advanceTimersByTime(2500);
    expect(refreshTracksMock).not.toHaveBeenCalled();

    setIntervalSpy.mockRestore();
  });
});
