const { Pool } = require("pg");
require("dotenv").config();

// Use SSL if connecting to Supabase; disable for local
const useSSL = process.env.DATABASE_URL?.includes("supabase") ? { rejectUnauthorized: false } : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: useSSL,
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Unexpected DB error:", err);
  // Do NOT call process.exit() here. Keep the server alive.
});

module.exports = pool;
