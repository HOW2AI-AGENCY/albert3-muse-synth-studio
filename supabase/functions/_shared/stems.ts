export interface NormalizedStemAsset {
  stemType: string;
  audioUrl: string;
  sourceKey: string;
}

export const getRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

export const sanitizeStemText = (text: unknown, maxLength = 2048): string => {
  if (typeof text !== "string") {
    return "";
  }
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .substring(0, maxLength)
    .trim();
};

export const resolveStemType = (key: string): string | null => {
  const normalised = key.toLowerCase().replace(/[^a-z]/g, "");
  if (!normalised.includes("url")) {
    return null;
  }
  if (normalised.includes("stream") || normalised.includes("source")) {
    return null;
  }

  const map: Record<string, string> = {
    originurl: "original",
    originalurl: "original",
    vocalurl: "vocals",
    vocalsurl: "vocals",
    backingvocalsurl: "backing_vocals",
    instrumentalurl: "instrumental",
    accompanimenturl: "instrumental",
    drumsurl: "drums",
    bassurl: "bass",
    guitarurl: "guitar",
    keyboardurl: "keyboard",
    percussionurl: "percussion",
    stringsurl: "strings",
    synthurl: "synth",
    fxurl: "fx",
    brassurl: "brass",
    woodwindsurl: "woodwinds",
  };

  if (map[normalised]) {
    return map[normalised];
  }

  return null;
};

const extractVocalRemovalInfo = (payload: Record<string, unknown>): Record<string, unknown> | null => {
  const data = getRecord(payload.data);
  if (data) {
    const info = getRecord(data.vocal_removal_info) ?? getRecord(data.vocalRemovalInfo);
    if (info) {
      return info;
    }
    const response = getRecord(data.response);
    if (response) {
      return response;
    }
  }

  const response = getRecord(payload.response);
  if (response) {
    return response;
  }

  return null;
};

export const extractStatusMessage = (payload: Record<string, unknown>): string | null => {
  if (typeof payload.msg === "string") {
    return payload.msg;
  }
  if (typeof payload.message === "string") {
    return payload.message;
  }

  const data = getRecord(payload.data);
  if (data) {
    if (typeof data.msg === "string") {
      return data.msg;
    }
    if (typeof data.message === "string") {
      return data.message;
    }
  }

  return null;
};

export const extractStemAssetsFromPayload = (
  payload: Record<string, unknown>,
): NormalizedStemAsset[] => {
  const info = extractVocalRemovalInfo(payload);
  if (!info) {
    return [];
  }

  const assets: NormalizedStemAsset[] = [];
  for (const [key, value] of Object.entries(info)) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    const stemType = resolveStemType(key);
    if (!stemType) {
      continue;
    }
    assets.push({ stemType, audioUrl: trimmed, sourceKey: key });
  }

  return assets;
};

export const determineSeparationMode = (
  currentMode: string | null,
  assetsCount: number,
): string => {
  if (currentMode && currentMode.trim()) {
    return currentMode.trim();
  }
  return assetsCount > 2 ? "split_stem" : "separate_vocal";
};
