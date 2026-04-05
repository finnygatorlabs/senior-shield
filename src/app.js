const express = require("express")
const authRoutes = require("./routes/auth")

const app = express()

app.use(express.json())

app.use("/api/auth", authRoutes)

app.get("/", (req, res) => {
  res.send("SeniorShield API is running 🚀")
})

module.exports = app
