#!/usr/bin/env tsx
/**
 * 🔄 Breakpoints Migration Script
 * Automated migration: useIsMobile() → useBreakpoints()
 * 
 * Processes all TypeScript/TSX files and replaces:
 *   - import { useIsMobile } from '@/hooks/use-mobile'
 *   → import { useBreakpoints } from '@/hooks/useBreakpoints'
 *   
 *   - const isMobile = useIsMobile()
 *   → const { isMobile } = useBreakpoints()
 * 
 * Usage: tsx scripts/migrate-breakpoints.ts
 * 
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

interface MigrationResult {
  file: string;
  changes: number;
  status: 'success' | 'skipped' | 'error';
  error?: string;
}

/**
 * Migrate single file from useIsMobile to useBreakpoints
 */
function migrateFile(filePath: string): MigrationResult {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let changes = 0;
    let migrated = content;
    
    // Pattern 1: import statement
    const importPattern = /import\s*{\s*useIsMobile\s*}\s*from\s*['"]@\/hooks\/use-mobile['"]/g;
    migrated = migrated.replace(importPattern, (match) => {
      changes++;
      return "import { useBreakpoints } from '@/hooks/useBreakpoints'";
    });
    
    // Pattern 2: hook usage
    const usagePattern = /const\s+isMobile\s*=\s*useIsMobile\(\)/g;
    migrated = migrated.replace(usagePattern, (match) => {
      changes++;
      return "const { isMobile } = useBreakpoints()";
    });
    
    if (changes > 0) {
      fs.writeFileSync(filePath, migrated, 'utf-8');
      return { file: filePath, changes, status: 'success' };
    }
    
    return { file: filePath, changes: 0, status: 'skipped' };
  } catch (error) {
    return { 
      file: filePath, 
      changes: 0, 
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Main migration logic
 */
function main() {
  console.log('🔄 Starting useIsMobile → useBreakpoints migration...\n');
  
  const files = globSync('src/**/*.{ts,tsx}', { 
    ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.spec.ts'] 
  });
  
  const results: MigrationResult[] = [];
  
  files.forEach(file => {
    const result = migrateFile(file);
    if (result.status === 'success' || result.status === 'error') {
      results.push(result);
    }
  });
  
  // Print summary
  const successful = results.filter(r => r.status === 'success');
  const errors = results.filter(r => r.status === 'error');
  
  console.log('\n📊 Migration Summary:');
  console.log(`✅ Migrated: ${successful.length} files`);
  console.log(`❌ Errors: ${errors.length} files`);
  
  if (successful.length > 0) {
    console.log('\n✅ Successfully migrated files:');
    successful.forEach(r => {
      console.log(`   ${r.file} (${r.changes} changes)`);
    });
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Failed to migrate:');
    errors.forEach(r => {
      console.log(`   ${r.file}: ${r.error}`);
    });
  }
  
  // Update deprecated marker in use-mobile.tsx
  const useMobilePath = 'src/hooks/use-mobile.tsx';
  if (fs.existsSync(useMobilePath)) {
    const useMobileContent = fs.readFileSync(useMobilePath, 'utf-8');
    
    if (!useMobileContent.includes('FULLY MIGRATED')) {
      const updated = `/**
 * @deprecated FULLY MIGRATED - Remove this file after v3.0.0
 * All ${successful.length} usages have been migrated to useBreakpoints
 * Migration date: ${new Date().toISOString().split('T')[0]}
 */
${useMobileContent}`;
      
      fs.writeFileSync(useMobilePath, updated, 'utf-8');
      console.log(`\n📝 Updated ${useMobilePath} with deprecation notice`);
    }
  }
  
  console.log('\n🎉 Migration complete!');
  console.log('📋 Next steps:');
  console.log('   1. Run: npm test');
  console.log('   2. Test application manually');
  console.log('   3. Commit changes: git commit -m "refactor: migrate useIsMobile to useBreakpoints"');
  
  process.exit(errors.length > 0 ? 1 : 0);
}

main();
