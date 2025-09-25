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
});

pool.on('connect', () => {
  console.log(' Connected to Supabase PostgreSQL database');
});

// Optional: capture unexpected errors
pool.on('error', (err) => {
  console.error('Unexpected DB error:', err);
  process.exit(-1);
});

module.exports = pool;
