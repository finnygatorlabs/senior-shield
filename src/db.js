const mysql = require("mysql2/promise")

let pool = null

function getDb() {
  if (!pool) {
    const url = process.env.DATABASE_URL

    if (!url) {
      console.log("⚠️ DATABASE_URL not set yet")
      return null
    }

    pool = mysql.createPool(url)
    console.log("✅ Database connected")
  }

  return pool
}

module.exports = { getDb }
