// user-service/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Determine SSL mode: default to true for Supabase, allow override for local/non-SSL DBs
const sslEnv = (process.env.PGSSLMODE || process.env.DATABASE_SSL || '').toString().toLowerCase();
const useSSL = sslEnv
  ? sslEnv !== 'disable' && sslEnv !== 'false' && sslEnv !== 'off'
  : true; // default to SSL on if not specified

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,

  // Add pool tuning for Supabase (prevents connection leaks / crashes)
  max: 10,                 // limit number of clients
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 10000, // fail fast if cannot connect
  keepAlive: true           // keep connections alive
});

pool.on('connect', () => {
  console.log('✅ Connected to Supabase PostgreSQL database');
});

// Handle unexpected errors gracefully
pool.on('error', (err) => {
  console.error('❌ Unexpected DB error:', err);
  // Instead of killing the whole process, just log it.
  // process.exit(-1);  <-- remove this (it causes your server to crash)
});

module.exports = pool;
