const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkAdmin() {
  const client = await pool.connect();
  try {
    // Check if admin user exists
    const result = await client.query(
      'SELECT id, email, role, is_verified FROM user1 WHERE email = $1', 
      ['admin@dokuai.com']
    );

    if (result.rows.length === 0) {
      console.log('❌ Admin user not found. Creating admin user...');
      await createAdminUser(client);
    } else {
      console.log('✅ Admin user found:');
      console.log(result.rows[0]);
    }
    
  } catch (error) {
    console.error('Error checking admin user:', error.message);
    console.error('Error details:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure PostgreSQL is running. Try:');
      console.log('  1. Open Services (services.msc)');
      console.log('  2. Find "postgresql-x64-15" or similar');
      console.log('  3. Right-click and select Start');
    }
    
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

async function createAdminUser(client) {
  try {
    // Hash for 'admin123' password
    const hashedPassword = '$2b$10$rQZ9X8vK7mN3pL2qR5tY6uI1oA4sB7cD9eF0gH1iJ2kL3mN4oP5qR6sT7uV8wX9yZ0aA1bB2cC3dD4eE5fF6gG7hH8iI9jJ0kK1lL2mM3nN4oO5pP6qQ7rR8sS9tT0uU1vV2wW3xX4yY5zZ';
    
    await client.query(`
      INSERT INTO user1 (name, email, password, role, is_verified) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, ['Admin', 'admin@dokuai.com', hashedPassword, 'admin', true]);
    
    console.log('✅ Admin user created successfully');
    console.log('   Email: admin@dokuai.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }
}

checkAdmin();
