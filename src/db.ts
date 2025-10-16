import "dotenv/config"
const Pool = require("pg").Pool

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
