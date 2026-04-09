require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// TEMP: allow all (debug mode)
app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ Mongo Error:", err));

app.use("/api/auth",      require("./routes/auth"));
app.use("/api/movies",    require("./routes/movies"));
app.use("/api/watchlist", require("./routes/watchlist"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));