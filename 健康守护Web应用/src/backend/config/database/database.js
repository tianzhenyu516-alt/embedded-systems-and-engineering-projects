import '../env/load-env.js';
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL
  || `postgres://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || ''}@${process.env.PGHOST || '127.0.0.1'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'postgres'}`;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ 数据库连接成功！');
    client.release();
    return true;
  } catch (err) {
    console.error('❌ 数据库连接失败:', err.message);
    return false;
  }
}

export { pool, testConnection, DATABASE_URL };
