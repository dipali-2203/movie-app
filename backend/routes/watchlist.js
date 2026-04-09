const express = require("express");
const router = express.Router();
const Watchlist = require("../models/Watchlist");
const auth = require("../middleware/auth");

// All watchlist routes require login
router.use(auth);

// GET — only this user's watchlist
router.get("/", async (req, res) => {
  try {
    const movies = await Watchlist.find({ userId: req.userId }).sort({ addedAt: -1 });
    res.json(movies);
  } catch {
    res.status(500).json({ error: "Failed to load watchlist" });
  }
});

// ADD
router.post("/", async (req, res) => {
  try {
    const { title, poster, movieId, rating } = req.body;

    const exists = await Watchlist.findOne({ userId: req.userId, movieId });
    if (exists) return res.json(exists);

    const movie = new Watchlist({ userId: req.userId, title, poster, movieId, rating });
    await movie.save();

    res.json(movie);
  } catch {
    res.status(500).json({ error: "Failed to add movie" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await Watchlist.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ msg: "Deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// TOGGLE FAVORITE
router.put("/:id", async (req, res) => {
  try {
    const movie = await Watchlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!movie) return res.status(404).json({ error: "Not found" });

    movie.favorite = !movie.favorite;
    await movie.save();

    res.json(movie);
  } catch {
    res.status(500).json({ error: "Failed to update" });
  }
});

module.exports = router;
