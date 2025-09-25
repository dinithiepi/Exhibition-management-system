const pool = require('./db'); // Adjust path to db.js as needed

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected successfully. Server time:', result.rows[0].now);
  } catch (err) {
    console.error('Database connection failed:', err);
  } finally {
    await pool.end();
  }
}

testConnection();
