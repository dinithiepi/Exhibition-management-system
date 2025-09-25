const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Supabase
});

// Log when connected
pool.on("connect", () => console.log("Connected to Supabase"));

// Handle unexpected errors on idle clients
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  // Optionally: alert or log for monitoring
});

module.exports = pool;
