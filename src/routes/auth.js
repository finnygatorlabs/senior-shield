const express = require("express")
const router = express.Router()
const { getDb } = require("../db")

router.get("/test", async (req, res) => {
  try {
    const db = getDb()

    if (!db) {
      return res.status(500).json({ error: "DB not ready" })
    }

    const [rows] = await db.query("SELECT 1 as test")

    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
