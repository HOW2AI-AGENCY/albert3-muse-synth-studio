export class PlaybackService {
  private audioContext: AudioContext;
  private isPlaying: boolean = false;
  private playbackPosition: number = 0;
  private intervalId: number | null = null;
  private onTimeUpdate: ((time: number) => void) | null = null;

  constructor() {
    this.audioContext = new AudioContext();
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.intervalId = window.setInterval(() => {
      this.playbackPosition += 1;
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.playbackPosition);
      }
    }, 1000); // Update every second
  }

  pause() {
    if (!this.isPlaying || this.intervalId === null) return;
    this.isPlaying = false;
    window.clearInterval(this.intervalId);
    this.intervalId = null;
  }

  stop() {
    this.pause();
    this.playbackPosition = 0;
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.playbackPosition);
    }
  }

  subscribe(callback: (time: number) => void) {
    this.onTimeUpdate = callback;
  }

  unsubscribe() {
    this.onTimeUpdate = null;
  }
}
