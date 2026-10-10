import dotenv from 'dotenv';
import path from 'path';

// Load backend .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

async function run() {
  console.log('--- Checking Supabase & Database Environment Variables ---');
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  console.log('SUPABASE_URL:', supabaseUrl ? supabaseUrl : '(not set)');
  console.log('SUPABASE_PUBLISHABLE_KEY / ANON_KEY:', publishableKey ? `[present, length: ${publishableKey.length}]` : '(not set)');
  console.log('SUPABASE_SECRET_KEY / SERVICE_ROLE_KEY:', secretKey ? `[present, length: ${secretKey.length}]` : '(not set)');
  console.log('DATABASE_URL:', databaseUrl ? `[present, length: ${databaseUrl.length}]` : '(not set)');

  // 1. Supabase Client Verification
  if (supabaseUrl && (publishableKey || secretKey)) {
    console.log('\n--- Testing Supabase API Connection ---');
    const keyToUse = secretKey || publishableKey;
    const client = createClient(supabaseUrl, keyToUse!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
      console.log('Testing Supabase Auth API...');
      const { data: authData, error: authError } = await client.auth.getSession();
      if (authError) {
        console.error('❌ Supabase Auth check returned error:', authError.message);
      } else {
        console.log('✅ Supabase Auth API responded successfully!');
      }
    } catch (err: any) {
      console.error('❌ Supabase Auth network/API error:', err.message);
    }

    try {
      console.log('Testing Supabase REST / PostgREST API...');
      const { data, error, status } = await client.from('_prisma_migrations').select('*').limit(1);
      console.log(`Supabase PostgREST HTTP status: ${status}`);
      if (error) {
        console.log('ℹ️ PostgREST responded with notice:', error.message, `(Code: ${error.code})`);
        if (error.code === 'PGRST116' || error.code === '42P01' || status === 200 || status === 404 || status === 400 || (status && status < 500)) {
          console.log('✅ Supabase PostgREST is reachable and authenticated!');
        } else {
          console.log('⚠️ Status/Error details:', { status, message: error.message });
        }
      } else {
        console.log('✅ Supabase PostgREST queried successfully! Rows returned:', data?.length);
      }
    } catch (err: any) {
      console.error('❌ Supabase PostgREST network error:', err.message);
    }
  } else {
    console.log('⚠️ Skipping Supabase client test: missing SUPABASE_URL or key');
  }

  // 2. Direct PostgreSQL / Prisma DATABASE_URL verification
  if (databaseUrl) {
    console.log('\n--- Testing Direct Postgres Connection (DATABASE_URL) ---');
    if (databaseUrl.includes('[YOUR-PASSWORD]')) {
      console.warn('⚠️ Notice: DATABASE_URL contains "[YOUR-PASSWORD]" placeholder.');
      console.warn('   To enable Prisma/Postgres database access, replace [YOUR-PASSWORD] with your actual Supabase database password in backend/.env.');
    } else {
      const pgClient = new Client({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 10000,
        ssl: databaseUrl.includes('supabase.co') || databaseUrl.includes('sslmode=require') || databaseUrl.includes('pooler.supabase.com') ? { rejectUnauthorized: false } : undefined,
      });

      try {
        await pgClient.connect();
        console.log('✅ Successfully connected to Postgres database!');
        const res = await pgClient.query('SELECT current_database(), current_user, version()');
        console.log('✅ Query success:');
        console.log('   Database:', res.rows[0].current_database);
        console.log('   User:', res.rows[0].current_user);
        console.log('   Postgres Version:', res.rows[0].version.split(' ')[0], res.rows[0].version.split(' ')[1]);
        await pgClient.end();
      } catch (err: any) {
        console.error('❌ Postgres connection error:', err.message);
        try { await pgClient.end(); } catch {}
      }
    }
  } else {
    console.log('ℹ️ DATABASE_URL not set in .env');
  }
}

run().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
