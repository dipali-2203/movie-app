const mongoose = require("mongoose");

const WatchlistSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  movieId:  { type: Number, required: true },
  title:    { type: String, required: true },
  poster:   { type: String },
  rating:   { type: Number, default: 0 },
  favorite: { type: Boolean, default: false },
  addedAt:  { type: Date, default: Date.now }
});

// Each user can only save a movie once
WatchlistSchema.index({ userId: 1, movieId: 1 }, { unique: true });

module.exports = mongoose.model("Watchlist", WatchlistSchema);
