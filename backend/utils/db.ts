// backend/utils/db.ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use your .env for credentials
  // Or use individual params:
  // user: process.env.PGUSER,
  // host: process.env.PGHOST,
  // database: process.env.PGDATABASE,
  // password: process.env.PGPASSWORD,
  // port: Number(process.env.PGPORT),
});

export default pool;
