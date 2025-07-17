const pool = require('../src/utils/db');

async function checkDatabase() {
  const client = await pool.connect();
  try {
    // Check if user1 table exists
    const userTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user1'
      );
    `);
    
    // Check if conversion_logs table exists
    const logsTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'conversion_logs'
      );
    `);

    // Get admin user
    const adminUser = await client.query(
      'SELECT * FROM user1 WHERE email = $1', 
      ['admin@dokuai.com']
    );

    console.log('Database Check Results:');
    console.log('----------------------');
    console.log(`1. user1 table exists: ${userTable.rows[0].exists}`);
    console.log(`2. conversion_logs table exists: ${logsTable.rows[0].exists}`);
    console.log('3. Admin user details:', adminUser.rows[0] ? 'Found' : 'Not found');
    
    if (adminUser.rows[0]) {
      console.log('   Email:', adminUser.rows[0].email);
      console.log('   Role:', adminUser.rows[0].role);
      console.log('   Is verified:', adminUser.rows[0].is_verified);
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase();
