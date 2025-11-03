#!/usr/bin/env tsx
/**
 * 🔒 Protected Files Validator
 * Validates that protected files are not modified without approval
 * 
 * Usage:
 *   - Pre-commit hook: Automatically validates staged changes
 *   - Manual: tsx scripts/validate-protected-files.ts
 * 
 * @version 1.0.0
 */

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

interface ProtectedConfig {
  protected: {
    files: string[];
    patterns: string[];
    rules: {
      requireApproval: boolean;
      requireTests: boolean;
      requireDocumentation: boolean;
    };
  };
}

/**
 * Get list of files modified in git staging area
 */
function getModifiedFiles(): string[] {
  try {
    const diff = execSync('git diff --cached --name-only', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return diff.trim().split('\n').filter(Boolean);
  } catch (error) {
    // If not in git repo or no staged files
    return [];
  }
}

/**
 * Check if file matches protected patterns
 */
function isProtected(file: string, config: ProtectedConfig): boolean {
  // Check exact matches
  if (config.protected.files.includes(file)) return true;
  
  // Check glob patterns
  return config.protected.patterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\./g, '\\.'));
    return regex.test(file);
  });
}

/**
 * Check if commit message contains approval marker
 */
function hasApproval(): boolean {
  try {
    const commitMsg = execSync('git log -1 --pretty=%B', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return commitMsg.includes('[APPROVED]') || commitMsg.includes('[PROTECTED-OVERRIDE]');
  } catch (error) {
    return false;
  }
}

/**
 * Main validation logic
 */
function main() {
  const configPath = path.join(process.cwd(), '.protectedrc.json');
  
  if (!fs.existsSync(configPath)) {
    console.log('⚠️  No .protectedrc.json found - skipping protected files validation');
    process.exit(0);
  }

  const config: ProtectedConfig = JSON.parse(
    fs.readFileSync(configPath, 'utf-8')
  );
  
  const modified = getModifiedFiles();
  
  if (modified.length === 0) {
    console.log('✅ No staged files to validate');
    process.exit(0);
  }

  const protectedModified = modified.filter(f => isProtected(f, config));
  
  if (protectedModified.length > 0) {
    console.error('\n❌ PROTECTED FILES MODIFIED WITHOUT APPROVAL:\n');
    protectedModified.forEach(f => console.error(`   🔒 ${f}`));
    
    console.error('\n📋 These files require Team Lead approval before commit.');
    console.error('📝 To proceed:');
    console.error('   1. Request approval via GitHub Issue: [PROTECTED] Modify <filename>');
    console.error('   2. Add [APPROVED] to your commit message');
    console.error('   3. Or use --no-verify to bypass (NOT RECOMMENDED)');
    console.error('');
    
    // Check for approval in commit message
    if (hasApproval()) {
      console.log('✅ [APPROVED] marker found in commit message - proceeding');
      process.exit(0);
    }
    
    process.exit(1);
  }
  
  console.log('✅ No protected files modified');
  process.exit(0);
}

main();
