const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const User    = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// ── SIGN UP ────────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: "All fields are required" });

    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const existingEmail = await User.findOne({ email });
    if (existingEmail)
      return res.status(400).json({ error: "Email already in use" });

    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ error: "Username already taken" });

    const hashed = await bcrypt.hash(password, 12);
    const user = new User({ username, email, password: hashed });
    await user.save();

    const token = makeToken(user._id);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// ── LOG IN ─────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "No account found with that email" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ error: "Incorrect password" });

    const token = makeToken(user._id);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── GET CURRENT USER (verify token) ───────────────
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to get user" });
  }
});

module.exports = router;
