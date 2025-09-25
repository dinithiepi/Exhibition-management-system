const { Client } = require("pg");

const client = new Client({
  connectionString: "postgresql://postgres.ulckzxbsufwjlsyxxzoz:uK8YT%Cp8P$3pPy@aws-1-ap-south-1.pooler.supabase.com:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

client.connect()
  .then(() => {
    console.log(" Connected to Supabase!");
    return client.query("SELECT NOW()");
  })
  .then(res => {
    console.log("Server time:", res.rows[0]);
  })
  .catch(err => {
    console.error("Connection error:", err);
  })
  .finally(() => client.end());
