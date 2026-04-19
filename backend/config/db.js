const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

let pool;

// Railway / cloud: use DATABASE_URL when available.
// Railway's managed Postgres requires SSL on the public URL, so default SSL
// ON whenever DATABASE_URL is set. Override with DB_SSL=false for the rare
// case (e.g. local docker, Railway internal network without TLS).
if (process.env.DATABASE_URL) {
  const sslDisabled = process.env.DB_SSL === 'false';
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslDisabled ? false : { rejectUnauthorized: false },
  });
} else {
  // Local development using discrete env vars
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'fitnessapp',
    port: Number(process.env.DB_PORT) || 5432,
  });
}

pool
  .connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch((err) => console.error('DB connection error', err));

pool.on('error', (err) => {
  // Log and let Railway's health check / supervisor restart the process.
  // Don't hard-exit on a single idle-client error — transient network blips
  // on managed Postgres are common.
  console.error('Unexpected error on idle client', err);
});

const query = (text, params) => {
  return pool.query(text, params);
};

module.exports = {
  pool,
  query,
};

