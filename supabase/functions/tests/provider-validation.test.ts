/**
 * Backend Validation Tests (Edge Functions)
 * Tests that backend validation schemas match frontend
 * 
 * @module functions/tests/provider-validation.test
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {
  validateGenerationParams,
  validateExtensionParams,
  validateStemSeparationParams,
  isValidModelForProvider,
  getDefaultModelForProvider,
  getValidModelsForProvider
} from "../_shared/provider-validation.ts";

Deno.test("Backend: Validate Suno generation params", () => {
  const params = {
    provider: "suno",
    prompt: "Epic orchestral music",
    modelVersion: "V5",
    styleTags: ["orchestral", "cinematic"],
    customMode: true
  };

  const result = validateGenerationParams(params);
  assertExists(result);
  assertEquals(result.provider, "suno");
  assertEquals(result.modelVersion, "V5");
});

Deno.test("Backend: Validate Mureka generation params", () => {
  const params = {
    provider: "mureka",
    prompt: "Chill lofi beats",
    modelVersion: "auto",
    isBGM: true
  };

  const result = validateGenerationParams(params);
  assertExists(result);
  assertEquals(result.provider, "mureka");
  assertEquals(result.isBGM, true);
});

Deno.test("Backend: Should reject invalid Suno model", () => {
  const params = {
    provider: "suno",
    prompt: "Test",
    modelVersion: "mureka-o1" // Wrong provider model
  };

  try {
    validateGenerationParams(params);
    throw new Error("Should have thrown validation error");
  } catch (error) {
    assertEquals((error as Error).name, "ZodError");
  }
});

Deno.test("Backend: Should reject invalid Mureka model", () => {
  const params = {
    provider: "mureka",
    prompt: "Test",
    modelVersion: "V5" // Wrong provider model
  };

  try {
    validateGenerationParams(params);
    throw new Error("Should have thrown validation error");
  } catch (error) {
    assertEquals((error as Error).name, "ZodError");
  }
});

Deno.test("Backend: Should reject Suno-only features for Mureka", () => {
  const params = {
    provider: "mureka",
    prompt: "Test",
    customMode: true // Suno-only feature
  };

  try {
    validateGenerationParams(params);
    throw new Error("Should have thrown validation error");
  } catch (error) {
    assertEquals((error as Error).name, "ZodError");
  }
});

Deno.test("Backend: Validate extension params", () => {
  const params = {
    originalTrackId: "123e4567-e89b-12d3-a456-426614174000",
    prompt: "Continue the epic journey",
    duration: 60
  };

  const result = validateExtensionParams(params);
  assertExists(result);
  assertEquals(result.duration, 60);
});

Deno.test("Backend: Validate stem separation params", () => {
  const params = {
    trackId: "123e4567-e89b-12d3-a456-426614174000",
    audioId: "123e4567-e89b-12d3-a456-426614174001",
    separationType: "separate_vocal"
  };

  const result = validateStemSeparationParams(params);
  assertExists(result);
  assertEquals(result.separationType, "separate_vocal");
});

Deno.test("Backend: isValidModelForProvider - Suno", () => {
  assertEquals(isValidModelForProvider("suno", "V5"), true);
  assertEquals(isValidModelForProvider("suno", "V4_5PLUS"), true);
  assertEquals(isValidModelForProvider("suno", "mureka-o1"), false);
});

Deno.test("Backend: isValidModelForProvider - Mureka", () => {
  assertEquals(isValidModelForProvider("mureka", "auto"), true);
  assertEquals(isValidModelForProvider("mureka", "mureka-o1"), true);
  assertEquals(isValidModelForProvider("mureka", "V5"), false);
});

Deno.test("Backend: getDefaultModelForProvider", () => {
  assertEquals(getDefaultModelForProvider("suno"), "V5");
  assertEquals(getDefaultModelForProvider("mureka"), "auto");
});

Deno.test("Backend: getValidModelsForProvider - Suno", () => {
  const models = getValidModelsForProvider("suno");
  assertEquals(models.includes("V5"), true);
  assertEquals(models.includes("V4_5PLUS"), true);
  assertEquals(models.includes("V4"), true);
});

Deno.test("Backend: getValidModelsForProvider - Mureka", () => {
  const models = getValidModelsForProvider("mureka");
  assertEquals(models.includes("auto"), true);
  assertEquals(models.includes("mureka-o1"), true);
  assertEquals(models.includes("mureka-7.5"), true);
});

Deno.test("Backend: Should validate prompt length limits", () => {
  const params = {
    provider: "suno",
    prompt: "a".repeat(3001), // Exceeds 3000 limit
    modelVersion: "V5"
  };

  try {
    validateGenerationParams(params);
    throw new Error("Should have thrown validation error");
  } catch (error) {
    assertEquals((error as Error).name, "ZodError");
  }
});

Deno.test("Backend: Should validate style tags count", () => {
  const params = {
    provider: "suno",
    prompt: "Test",
    styleTags: Array(21).fill("tag") // Exceeds 20 limit
  };

  try {
    validateGenerationParams(params);
    throw new Error("Should have thrown validation error");
  } catch (error) {
    assertEquals((error as Error).name, "ZodError");
  }
});
