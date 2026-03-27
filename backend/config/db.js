const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

let pool;

// Railway / cloud: use DATABASE_URL when available
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
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
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const query = (text, params) => {
  return pool.query(text, params);
};

module.exports = {
  pool,
  query,
};

