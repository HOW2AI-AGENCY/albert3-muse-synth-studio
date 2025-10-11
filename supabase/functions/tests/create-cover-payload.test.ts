import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Mock payload builder (extracted logic from create-cover)
function buildSunoPayload(params: {
  customMode: boolean;
  instrumental: boolean;
  prompt?: string;
  tags?: string[];
  title?: string;
  audioReference: string;
  model?: string;
  audioWeight?: number;
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
}) {
  const {
    customMode,
    instrumental,
    prompt,
    tags,
    title,
    audioReference,
    model,
    audioWeight,
    negativeTags,
    vocalGender,
    styleWeight,
    weirdnessConstraint
  } = params;

  const payload: any = {
    uploadUrl: audioReference,
    customMode,
    instrumental,
    model: model || 'V5',
    callBackUrl: 'http://test.callback'
  };

  if (customMode) {
    payload.style = tags?.join(', ') || 'Pop';
    payload.title = title || 'Test Track';
    
    if (!instrumental && prompt) {
      payload.prompt = prompt;
    }
  } else {
    payload.prompt = prompt;
  }

  if (audioWeight !== undefined) {
    payload.audioWeight = Math.max(0, Math.min(1, audioWeight));
  }
  if (negativeTags) {
    payload.negativeTags = negativeTags;
  }
  if (vocalGender) {
    payload.vocalGender = vocalGender;
  }
  if (styleWeight !== undefined) {
    payload.styleWeight = Math.max(0, Math.min(1, styleWeight));
  }
  if (weirdnessConstraint !== undefined) {
    payload.weirdnessConstraint = Math.max(0, Math.min(1, weirdnessConstraint));
  }

  return payload;
}

Deno.test('create-cover: Custom Mode with vocals', () => {
  const payload = buildSunoPayload({
    customMode: true,
    instrumental: false,
    prompt: 'Test lyrics [Verse]\nHello world',
    tags: ['Pop', 'Electronic'],
    title: 'Test Track',
    audioReference: 'https://example.com/audio.mp3'
  });
  
  assertEquals(payload.uploadUrl, 'https://example.com/audio.mp3');
  assertEquals(payload.customMode, true);
  assertEquals(payload.instrumental, false);
  assertEquals(payload.style, 'Pop, Electronic');
  assertEquals(payload.title, 'Test Track');
  assertEquals(payload.prompt, 'Test lyrics [Verse]\nHello world');
  assertEquals(payload.model, 'V5');
});

Deno.test('create-cover: Custom Mode instrumental', () => {
  const payload = buildSunoPayload({
    customMode: true,
    instrumental: true,
    tags: ['Jazz', 'Smooth'],
    title: 'Instrumental Jazz',
    audioReference: 'https://example.com/audio.mp3'
  });
  
  assertEquals(payload.customMode, true);
  assertEquals(payload.instrumental, true);
  assertEquals(payload.style, 'Jazz, Smooth');
  assertEquals(payload.title, 'Instrumental Jazz');
  assertEquals(payload.prompt, undefined); // No prompt for instrumental
});

Deno.test('create-cover: Non-custom Mode', () => {
  const payload = buildSunoPayload({
    customMode: false,
    instrumental: false,
    prompt: 'Song about love',
    audioReference: 'https://example.com/audio.mp3'
  });
  
  assertEquals(payload.customMode, false);
  assertEquals(payload.prompt, 'Song about love');
  assertEquals(payload.style, undefined); // No style in non-custom mode
  assertEquals(payload.title, undefined); // No title in non-custom mode
});

Deno.test('create-cover: Optional parameters', () => {
  const payload = buildSunoPayload({
    customMode: true,
    instrumental: false,
    prompt: 'Test',
    audioReference: 'https://example.com/audio.mp3',
    audioWeight: 0.75,
    negativeTags: 'Heavy Metal, Rock',
    vocalGender: 'm',
    styleWeight: 0.5,
    weirdnessConstraint: 0.3
  });
  
  assertEquals(payload.audioWeight, 0.75);
  assertEquals(payload.negativeTags, 'Heavy Metal, Rock');
  assertEquals(payload.vocalGender, 'm');
  assertEquals(payload.styleWeight, 0.5);
  assertEquals(payload.weirdnessConstraint, 0.3);
});

Deno.test('create-cover: audioWeight clamping', () => {
  const payload1 = buildSunoPayload({
    customMode: true,
    instrumental: false,
    prompt: 'Test',
    audioReference: 'https://example.com/audio.mp3',
    audioWeight: 1.5 // Out of range
  });
  assertEquals(payload1.audioWeight, 1.0); // Clamped to max

  const payload2 = buildSunoPayload({
    customMode: true,
    instrumental: false,
    prompt: 'Test',
    audioReference: 'https://example.com/audio.mp3',
    audioWeight: -0.5 // Out of range
  });
  assertEquals(payload2.audioWeight, 0.0); // Clamped to min
});
