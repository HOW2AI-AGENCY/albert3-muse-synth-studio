import type { StyleCategory, MusicStyle } from "@/data/music-styles";

export type { StyleCategory, MusicStyle } from "@/data/music-styles";

export interface StyleRecommendationRequest {
  mood?: string;
  genre?: string;
  context?: string;
  currentTags?: string[];
}

export interface StyleRecommendationResult {
  tags: string[];
  instruments: string[];
  techniques: string[];
  vocalStyle?: string | null;
  references?: string[];
}

export interface StyleRecommendationResponse {
  suggestions: StyleRecommendationResult;
}

export interface StyleGraphNode {
  style: MusicStyle;
  related: MusicStyle[];
}

export interface StylePreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  styleIds: string[];
  gradient: string;
}
