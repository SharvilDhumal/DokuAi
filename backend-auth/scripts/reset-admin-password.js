const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function resetAdminPassword() {
  const client = await pool.connect();
  try {
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await client.query(
      `UPDATE user1 
       SET password = $1, is_verified = true, role = 'admin'
       WHERE email = $2
       RETURNING id, email, role, is_verified`,
      [hashedPassword, 'admin@dokuai.com']
    );

    if (result.rowCount === 0) {
      console.log('❌ Admin user not found. Creating one...');
      await createAdminUser(client, hashedPassword);
    } else {
      console.log('✅ Admin password reset successfully');
      console.log('   Email: admin@dokuai.com');
      console.log('   New Password: admin123');
      console.log('   Role:', result.rows[0].role);
      console.log('   Is Verified:', result.rows[0].is_verified);
    }
    
  } catch (error) {
    console.error('Error resetting admin password:', error.message);
    
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

async function createAdminUser(client, hashedPassword) {
  try {
    const result = await client.query(
      `INSERT INTO user1 (name, email, password, role, is_verified) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role, is_verified`,
      ['Admin', 'admin@dokuai.com', hashedPassword, 'admin', true]
    );
    
    console.log('✅ Admin user created successfully');
    console.log('   Email: admin@dokuai.com');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }
}

resetAdminPassword();
