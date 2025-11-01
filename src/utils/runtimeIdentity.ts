/**
 * Runtime React/Router Instance Validator
 * Week 4, Phase 2.2: React Duplication Fix
 * 
 * This utility detects and warns about multiple React/Router instances at runtime.
 * Multiple instances cause "Cannot read properties of null (reading 'useState')" errors.
 */

import { logger } from './logger';

// Symbols to track first-seen instances
const REACT_INSTANCE_KEY = Symbol.for('__APP_REACT_INSTANCE__');
const ROUTER_INSTANCE_KEY = Symbol.for('__APP_ROUTER_INSTANCE__');

interface GlobalWithInstances {
  [REACT_INSTANCE_KEY]?: unknown;
  [ROUTER_INSTANCE_KEY]?: unknown;
}

/**
 * Validates that React is loaded only once across the entire application
 */
export function validateReactInstance(context: string): void {
  if (import.meta.env.PROD) return; // Only run in development

  const glob = globalThis as GlobalWithInstances;

  // Dynamically import React to check instance
  import('react').then((ReactModule) => {
    if (!glob[REACT_INSTANCE_KEY]) {
      // First time seeing React - store it
      glob[REACT_INSTANCE_KEY] = ReactModule;
      logger.info(`React instance registered from: ${context}`, 'RuntimeIdentity');
    } else if (glob[REACT_INSTANCE_KEY] !== ReactModule) {
      // CRITICAL: Different React instance detected!
      logger.error(
        `❌ DUPLICATE REACT INSTANCE DETECTED in ${context}!`,
        new Error('React duplication'),
        'RuntimeIdentity',
        {
          context,
          firstInstance: glob[REACT_INSTANCE_KEY],
          currentInstance: ReactModule,
          hint: 'Check vite.config.ts dedupe settings and remove manualChunks',
        }
      );
      
      // Show console warning with actionable guidance
      console.warn(
        `%c⚠️ CRITICAL: Multiple React instances detected!`,
        'color: red; font-size: 16px; font-weight: bold;',
        `\n\nContext: ${context}`,
        '\n\nThis causes "Cannot read properties of null" errors.',
        '\n\nFix:',
        '\n1. Check vite.config.ts has proper dedupe config',
        '\n2. Remove manual chunk splitting for React',
        '\n3. Clear node_modules/.vite cache',
        '\n4. Hard refresh (Ctrl+Shift+R)'
      );
    } else {
      logger.debug(`React instance validated (same) from: ${context}`, 'RuntimeIdentity');
    }
  });
}

/**
 * Validates that React Router is loaded only once
 */
export function validateRouterInstance(context: string): void {
  if (import.meta.env.PROD) return; // Only run in development

  const glob = globalThis as GlobalWithInstances;

  // Dynamically import React Router to check instance
  import('react-router-dom').then((RouterModule) => {
    if (!glob[ROUTER_INSTANCE_KEY]) {
      // First time seeing Router - store it
      glob[ROUTER_INSTANCE_KEY] = RouterModule;
      logger.info(`React Router instance registered from: ${context}`, 'RuntimeIdentity');
    } else if (glob[ROUTER_INSTANCE_KEY] !== RouterModule) {
      // CRITICAL: Different Router instance detected!
      logger.error(
        `❌ DUPLICATE REACT ROUTER INSTANCE DETECTED in ${context}!`,
        new Error('React Router duplication'),
        'RuntimeIdentity',
        {
          context,
          firstInstance: glob[ROUTER_INSTANCE_KEY],
          currentInstance: RouterModule,
          hint: 'Check vite.config.ts dedupe includes react-router-dom',
        }
      );

      console.warn(
        `%c⚠️ CRITICAL: Multiple React Router instances detected!`,
        'color: red; font-size: 16px; font-weight: bold;',
        `\n\nContext: ${context}`,
        '\n\nThis causes useNavigate/useLocation hook errors.',
        '\n\nFix:',
        '\n1. Add "react-router-dom" to vite.config.ts dedupe array',
        '\n2. Clear cache and rebuild'
      );
    } else {
      logger.debug(`React Router instance validated (same) from: ${context}`, 'RuntimeIdentity');
    }
  });
}

/**
 * Validates both React and Router instances
 */
export function validateAllInstances(context: string): void {
  validateReactInstance(context);
  validateRouterInstance(context);
}
