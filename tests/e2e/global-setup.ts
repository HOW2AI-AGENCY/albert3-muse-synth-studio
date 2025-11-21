import { execSync } from 'node:child_process';

export default async function globalSetup() {
  if (process.env.SKIP_DB_SEED === 'true') {
    return;
  }

  try {
    execSync('npm run db:seed', { stdio: 'inherit' });
  } catch (error) {
    throw new Error('Failed to seed Supabase data for e2e tests.');
    throw error;
  }
}
