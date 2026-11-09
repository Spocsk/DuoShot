#!/usr/bin/env node
// Admin-only: issue a single-use "call7d" trial link after a call. Only the sha256 hex of
// the token is stored (never the token itself), with an expiry N days out (default 7,
// --days N). Prints only the trial link and its expiry. No HTTP route exposes this.
//   npm run call7d:token -- --days 7
import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const daysFlag = process.argv.indexOf('--days');
const days = daysFlag === -1 ? 7 : Number(process.argv[daysFlag + 1]);
if (!Number.isInteger(days) || days < 1 || days > 366) {
  console.error('Usage: npm run call7d:token -- [--days N]  (1..366, default 7)');
  process.exit(1);
}

const url = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (!url || !key || !siteUrl) {
  console.error('Missing Supabase service role credentials or NEXT_PUBLIC_SITE_URL');
  process.exit(1);
}

const token = randomBytes(32).toString('base64url');
const tokenHash = createHash('sha256').update(token).digest('hex');
const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error } = await admin.from('call_trial_tokens').insert({ token_hash: tokenHash, expires_at: expiresAt });
if (error) {
  console.error('Could not store the trial token');
  process.exit(1);
}

console.log(`${siteUrl.replace(/\/$/, '')}/api/stripe/call-trial?token=${token}`);
console.log(`Expires: ${expiresAt}`);
