const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log('Current database time:', result.rows[0].now);
    
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\nTables in database:');
    console.log('------------------');
    if (tables.rows.length === 0) {
      console.log('No tables found. You need to run the schema.sql script.');
    } else {
      tables.rows.forEach(row => console.log(`- ${row.table_name}`));
    }
    
  } catch (error) {
    console.error('❌ Database connection error:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Tip: Make sure your PostgreSQL server is running.');
      console.log('You can start it with: pg_ctl -D "C:\\Program Files\\PostgreSQL\\15\\data" start');
    } else if (error.code === '3D000') {
      console.log('\n💡 Tip: The database does not exist. Create it with:');
      console.log('createdb -U postgres postgres');
    } else if (error.code === '28P01') {
      console.log('\n💡 Tip: Authentication failed. Check your DB_USER and DB_PASSWORD in .env');
    }
    
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

testConnection();
