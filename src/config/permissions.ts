/**
 * @fileoverview Defines feature permissions for different subscription plans.
 * @description This configuration is currently maintained for reference and potential
 * future use in client-side logic. The primary source of truth for feature access
 * is the `features` array within the `subscription_plans` table in the database,
 * managed via the `SubscriptionContext`.
 */

export const FEATURE_PERMISSIONS: Record<string, string[]> = {
  simple_mode: ['free', 'pro', 'studio', 'enterprise'],
  basic_generation: ['free', 'pro', 'studio', 'enterprise'],
  lyrics_editor: ['free', 'pro', 'studio', 'enterprise'],
  pro_mode: ['pro', 'studio', 'enterprise'],
  ai_field_actions: ['pro', 'studio', 'enterprise'],
  reference_audio: ['pro', 'studio', 'enterprise'],
  daw_light: ['pro', 'studio', 'enterprise'],
  stems: ['pro', 'studio', 'enterprise'],
  lyrics_ai_tools: ['pro', 'studio', 'enterprise'],
  creative_director: ['studio', 'enterprise'],
  ai_context: ['studio', 'enterprise'],
  daw_advanced: ['studio', 'enterprise'],
  lyrics_drag_drop: ['studio', 'enterprise'],
  multi_reference: ['studio', 'enterprise'],
  project_templates: ['studio', 'enterprise'],
  wav_export: ['studio', 'enterprise'],
  midi_export: ['studio', 'enterprise'],
  collaboration: ['enterprise'],
  admin_panel: ['enterprise'],
  team_management: ['enterprise'],
  custom_workflows: ['enterprise'],
};
