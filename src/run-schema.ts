import "dotenv/config"
import { readFileSync } from "fs"
const Pool = require("pg").Pool

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL not found in .env")

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  const schema = readFileSync("./src/schema.sql", "utf8")

  try {
    await pool.query(schema)
    console.log("✅ Schema executed successfully.")
  } catch (err) {
    console.error("❌ Error executing schema:", err)
  } finally {
    await pool.end()
  }
}

main()
