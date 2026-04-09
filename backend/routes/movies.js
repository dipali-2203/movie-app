const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const router = express.Router();

const KEY = process.env.TMDB_API_KEY;
const TMDB = "https://api.themoviedb.org/3";

// ── MOOD → GENRE IDs (TMDB official IDs) ──────────
const MOOD_MAP = {
  happy:     [35, 10751],       // Comedy, Family
  sad:       [18, 10749],       // Drama, Romance
  chill:     [35, 99, 10402],   // Comedy, Documentary, Music
  thriller:  [53, 80, 9648],    // Thriller, Crime, Mystery
  romantic:  [10749, 18, 35],   // Romance, Drama, Comedy
  adventure: [12, 28, 14],      // Adventure, Action, Fantasy
  scifi:     [878, 28, 12],     // Sci-Fi, Action, Adventure
  horror:    [27, 53, 9648],    // Horror, Thriller, Mystery
};

// Genres to always exclude (Animation, Kids)
const EXCLUDE_GENRES = [16, 10751];

// ── SEARCH ────────────────────────────────────────
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json([]);

    const r = await fetch(`${TMDB}/search/movie?api_key=${KEY}&query=${encodeURIComponent(query)}&include_adult=false`);
    const data = await r.json();
    res.json(data.results || []);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// ── DETAILS ───────────────────────────────────────
router.get("/details/:id", async (req, res) => {
  try {
    const r = await fetch(`${TMDB}/movie/${req.params.id}?api_key=${KEY}&append_to_response=credits`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error("Details error:", err);
    res.status(500).json({ error: "Details failed" });
  }
});

// ── RECOMMENDATIONS (SMART) ────────────────────────
//
// Logic:
//  1. If mood is passed → use mood genres directly
//  2. If watchlist exists → extract genres weighted by favorites
//  3. Combine mood genres + watchlist genres (mood takes priority)
//  4. Also collect favourite actor/director IDs from watchlist (via credits)
//     and boost results that share cast/crew
//  5. Filter out already-watched, exclude kid genres, require rating ≥ 6
//  6. Sort by a computed score: popularity + rating + cast/crew match bonus

router.get("/recommend", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const mood = req.query.mood || "";

    const Watchlist = require("../models/Watchlist");
    const watchlist = await Watchlist.find();

    // ── STEP 1: Build genre score map ──────────────
    let genreScore = {};

    // From mood
    if (mood && MOOD_MAP[mood]) {
      MOOD_MAP[mood].forEach((id, i) => {
        genreScore[id] = (genreScore[id] || 0) + (10 - i * 2); // first genre gets highest weight
      });
    }

    // From watchlist (favorites count 3x)
    let castIds = new Set();
    let directorIds = new Set();

    if (watchlist.length > 0) {
      const toAnalyse = watchlist.slice(0, 8); // analyse up to 8 movies

      await Promise.all(toAnalyse.map(async (wm) => {
        try {
          const r = await fetch(`${TMDB}/movie/${wm.movieId}?api_key=${KEY}&append_to_response=credits`);
          const data = await r.json();

          if (!data.genres) return;

          const weight = wm.favorite ? 4 : 1;
          data.genres.forEach(g => {
            if (!EXCLUDE_GENRES.includes(g.id)) {
              genreScore[g.id] = (genreScore[g.id] || 0) + weight;
            }
          });

          // Collect top cast (first 3 billed actors) and director
          if (data.credits) {
            (data.credits.cast || []).slice(0, 3).forEach(a => castIds.add(a.id));
            (data.credits.crew || [])
              .filter(c => c.job === "Director")
              .forEach(d => directorIds.add(d.id));
          }
        } catch (e) {
          // skip individual movie failures silently
        }
      }));
    }

    // Remove excluded genres
    EXCLUDE_GENRES.forEach(id => delete genreScore[id]);

    // ── STEP 2: Pick top 3 genres ──────────────────
    const topGenres = Object.keys(genreScore)
      .sort((a, b) => genreScore[b] - genreScore[a])
      .slice(0, 3);

    // ── STEP 3: Fetch movies from TMDB ────────────
    const watchlistIds = new Set(watchlist.map(w => w.movieId));

    // Run 2 requests for variety: sorted by popularity AND by vote_average
    const genreParam = topGenres.join(",");
    const baseUrl = `${TMDB}/discover/movie?api_key=${KEY}&include_adult=false&vote_average.gte=6&vote_count.gte=200`;

    const urls = topGenres.length > 0
      ? [
          `${baseUrl}&with_genres=${genreParam}&sort_by=popularity.desc&page=${page}`,
          `${baseUrl}&with_genres=${genreParam}&sort_by=vote_average.desc&page=${page}`,
        ]
      : [
          `${baseUrl}&sort_by=popularity.desc&page=${page}`,
        ];

    const responses = await Promise.all(urls.map(u => fetch(u).then(r => r.json())));
    const allMovies = responses.flatMap(d => d.results || []);

    // ── STEP 4: Deduplicate + filter ──────────────
    const seen = new Map();
    allMovies.forEach(m => {
      if (!seen.has(m.id) && m.poster_path && !watchlistIds.has(m.id)) {
        seen.set(m.id, m);
      }
    });

    // ── STEP 5: Score & sort ──────────────────────
    // Score = normalised popularity + 2×rating + cast/director bonus
    const movieList = Array.from(seen.values());
    const maxPop = Math.max(...movieList.map(m => m.popularity), 1);

    const scored = movieList.map(m => {
      let score = (m.popularity / maxPop) * 30          // popularity (0-30)
                + (m.vote_average || 0) * 4              // rating (0-40)
                + Math.log10((m.vote_count || 1) + 1);  // vote count credibility

      return { ...m, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);

    res.json(scored.slice(0, 24));

  } catch (err) {
    console.error("RECOMMEND ERROR:", err);
    res.status(500).json({ error: "Recommendation failed" });
  }
});

module.exports = router;
