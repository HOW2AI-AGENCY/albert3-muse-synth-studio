/**
 * Audio recording utilities
 * Records audio from Web Audio API AudioContext to file
 */

/**
 * Записывает аудио из AudioContext в blob
 */
export class AudioRecorder {
  private audioContext: AudioContext;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private destination: MediaStreamAudioDestinationNode | null = null;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  /**
   * Начинает запись аудио
   * @returns MediaStreamAudioDestinationNode для подключения источников звука
   */
  async startRecording(): Promise<MediaStreamAudioDestinationNode> {
    this.recordedChunks = [];
    this.destination = this.audioContext.createMediaStreamDestination();
    
    this.mediaRecorder = new MediaRecorder(this.destination.stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // Собирать данные каждые 100ms
    return this.destination;
  }

  /**
   * Останавливает запись и возвращает Blob с аудио
   * @returns Promise<Blob> с записанным аудио
   */
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recording not started'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.recordedChunks = [];
        resolve(blob);
      };

      this.mediaRecorder.onerror = (error) => {
        reject(error);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Отключает destination node
   */
  cleanup() {
    if (this.destination) {
      this.destination.disconnect();
      this.destination = null;
    }
    this.mediaRecorder = null;
  }
}
