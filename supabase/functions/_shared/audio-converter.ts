/**
 * Audio conversion utility for Mureka API compatibility
 * Converts various audio formats to WAV using FFmpeg
 */

export async function convertAudioToWav(audioBlob: Blob): Promise<Blob> {
  // Check if already WAV
  if (audioBlob.type === 'audio/wav' || audioBlob.type === 'audio/wave') {
    return audioBlob;
  }

  // Create temporary file for input
  const inputPath = `/tmp/input_${Date.now()}.${getFileExtension(audioBlob.type)}`;
  const outputPath = `/tmp/output_${Date.now()}.wav`;

  try {
    // Write input file
    const arrayBuffer = await audioBlob.arrayBuffer();
    await Deno.writeFile(inputPath, new Uint8Array(arrayBuffer));

    // Run FFmpeg conversion
    const command = new Deno.Command('ffmpeg', {
      args: [
        '-i', inputPath,
        '-acodec', 'pcm_s16le',  // 16-bit PCM
        '-ar', '44100',           // 44.1kHz sample rate
        '-ac', '2',               // Stereo
        '-y',                     // Overwrite output
        outputPath
      ],
      stdout: 'piped',
      stderr: 'piped',
    });

    const process = command.spawn();
    const { code, stderr } = await process.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`FFmpeg conversion failed: ${errorText}`);
    }

    // Read converted file
    const wavData = await Deno.readFile(outputPath);
    const wavBlob = new Blob([wavData], { type: 'audio/wav' });

    return wavBlob;
  } finally {
    // Cleanup
    try {
      await Deno.remove(inputPath);
    } catch {}
    try {
      await Deno.remove(outputPath);
    } catch {}
  }
}

function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/webm': 'webm',
  };
  return map[mimeType] || 'mp3';
}
