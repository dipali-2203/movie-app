const API = "https://movie-app-backend-jgik.onrender.com/api";

let currentMood = "";
let recPage = 1;
let isLoading = false;
let currentUser = null;

/* ── TOKEN HELPERS ─────────────────────────────── */
function getToken() { return localStorage.getItem("cm_token"); }
function setToken(t) { localStorage.setItem("cm_token", t); }
function clearToken() { localStorage.removeItem("cm_token"); }

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  };
}

/* ── AUTH STATE ────────────────────────────────── */
function setUser(user) {
  currentUser = user;
  document.getElementById("auth-btns").classList.remove("hidden");
  document.getElementById("user-menu").classList.remove("hidden");

  if (user) {
    // logged in
    document.getElementById("auth-btns").classList.add("hidden");
    document.getElementById("user-avatar").textContent = user.username[0].toUpperCase();
    document.getElementById("dropdown-name").textContent = user.username;
    document.getElementById("dropdown-email").textContent = user.email;
  } else {
    // logged out
    document.getElementById("user-menu").classList.add("hidden");
  }
}

async function checkAuth() {
  const token = getToken();
  if (!token) { setUser(null); return; }

  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      setUser(user);
    } else {
      clearToken();
      setUser(null);
    }
  } catch {
    setUser(null);
  }
}

function logout() {
  clearToken();
  setUser(null);
  closeUserDropdown();
  document.getElementById("watchlist").innerHTML = "";
  document.getElementById("wl-count").textContent = "0";
  document.getElementById("wl-empty").classList.remove("hidden");
  loadRecommendations();
  showToast("Logged out");
}

/* ── AUTH MODAL ────────────────────────────────── */
function openAuth(tab = "login") {
  document.getElementById("auth-overlay").classList.remove("hidden");
  switchTab(tab);
}

function closeAuthModal(e) {
  if (!e || e.target === document.getElementById("auth-overlay")) {
    document.getElementById("auth-overlay").classList.add("hidden");
    clearAuthErrors();
  }
}

function switchTab(tab) {
  document.getElementById("form-login").classList.toggle("hidden", tab !== "login");
  document.getElementById("form-signup").classList.toggle("hidden", tab !== "signup");
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-signup").classList.toggle("active", tab === "signup");
  clearAuthErrors();
}

function clearAuthErrors() {
  ["login-error", "signup-error"].forEach(id => {
    const el = document.getElementById(id);
    el.classList.add("hidden");
    el.textContent = "";
  });
}

function showAuthError(formType, msg) {
  const el = document.getElementById(`${formType}-error`);
  el.textContent = msg;
  el.classList.remove("hidden");
}

async function submitLogin() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn      = document.getElementById("login-btn");

  if (!email || !password) return showAuthError("login", "Please fill in all fields");

  btn.textContent = "Logging in…";
  btn.disabled = true;

  try {
    const res  = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showAuthError("login", data.error || "Login failed");
    } else {
      setToken(data.token);
      setUser(data.user);
      closeAuthModal();
      showToast(`Welcome back, ${data.user.username}! 👋`);
      loadWatchlist();
      loadRecommendations();
    }
  } catch {
    showAuthError("login", "Connection error — is the server running?");
  }

  btn.textContent = "Log in";
  btn.disabled = false;
}

async function submitSignup() {
  const username = document.getElementById("signup-username").value.trim();
  const email    = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const btn      = document.getElementById("signup-btn");

  if (!username || !email || !password) return showAuthError("signup", "Please fill in all fields");

  btn.textContent = "Creating account…";
  btn.disabled = true;

  try {
    const res  = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showAuthError("signup", data.error || "Signup failed");
    } else {
      setToken(data.token);
      setUser(data.user);
      closeAuthModal();
      showToast(`Welcome to CineMatch, ${data.user.username}! 🎬`);
      loadWatchlist();
      loadRecommendations();
    }
  } catch {
    showAuthError("signup", "Connection error — is the server running?");
  }

  btn.textContent = "Create account";
  btn.disabled = false;
}

/* ── USER DROPDOWN ─────────────────────────────── */
function toggleUserDropdown() {
  document.getElementById("user-dropdown").classList.toggle("hidden");
}

function closeUserDropdown() {
  document.getElementById("user-dropdown").classList.add("hidden");
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  const menu = document.getElementById("user-menu");
  if (menu && !menu.contains(e.target)) closeUserDropdown();
});

/* ── MOOD ──────────────────────────────────────── */
function setMood(btn) {
  document.querySelectorAll(".mood-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentMood = btn.dataset.mood;
  recPage = 1;
  loadRecommendations();
}

/* ── SEARCH ────────────────────────────────────── */
async function searchMovies() {
  const query = document.getElementById("search").value.trim();
  if (!query) return;

  const section   = document.getElementById("search-section");
  const container = document.getElementById("movies");
  section.style.display = "block";
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  showSkeletons(container, 6);

  try {
    const [moviesRes, watchlistRes] = await Promise.all([
      fetch(`${API}/movies/search?q=${encodeURIComponent(query)}`),
      currentUser
        ? fetch(`${API}/watchlist`, { headers: authHeaders() })
        : Promise.resolve({ json: () => [] })
    ]);
    const movies    = await moviesRes.json();
    const watchlist = currentUser ? await watchlistRes.json() : [];

    container.innerHTML = "";
    if (!movies.length) {
      container.innerHTML = `<p class="empty-hint">No results for "${query}"</p>`;
      return;
    }
    movies.filter(m => m.poster_path).forEach(m => {
      container.appendChild(buildCard(m, Array.isArray(watchlist) ? watchlist : []));
    });
  } catch {
    container.innerHTML = `<p class="empty-hint">Search failed. Is the server running?</p>`;
  }
}

function clearSearch() {
  document.getElementById("search").value = "";
  document.getElementById("search-section").style.display = "none";
  document.getElementById("movies").innerHTML = "";
}

/* ── WATCHLIST ─────────────────────────────────── */
async function loadWatchlist() {
  const container  = document.getElementById("watchlist");
  const empty      = document.getElementById("wl-empty");
  const countBadge = document.getElementById("wl-count");

  if (!currentUser) {
    container.innerHTML = `
      <div class="login-wall">
        <p>Log in to save movies to your watchlist</p>
        <button class="btn-primary" onclick="openAuth('login')">Log in</button>
      </div>`;
    countBadge.textContent = "0";
    empty.classList.add("hidden");
    return;
  }

  try {
    const res  = await fetch(`${API}/watchlist`, { headers: authHeaders() });
    const data = await res.json();

    countBadge.textContent = Array.isArray(data) ? data.length : 0;
    container.innerHTML = "";

    if (!Array.isArray(data) || !data.length) {
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    data.forEach(m => container.appendChild(buildWatchlistCard(m)));
  } catch {
    empty.classList.remove("hidden");
  }
}

async function handleAdd(btn, id, title, poster, rating) {
  if (!currentUser) {
    openAuth("login");
    return;
  }

  btn.textContent = "…";
  btn.disabled = true;

  try {
    await fetch(`${API}/watchlist`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title, poster, movieId: id, rating })
    });
    btn.textContent = "✓ Saved";
    showToast(`"${title}" added to watchlist`);
    loadWatchlist();
    loadRecommendations();
  } catch {
    btn.textContent = "+ Add";
    btn.disabled = false;
  }
}

async function removeMovie(id) {
  await fetch(`${API}/watchlist/${id}`, { method: "DELETE", headers: authHeaders() });
  showToast("Removed from watchlist");
  loadWatchlist();
  loadRecommendations();
}

async function toggleFavorite(id) {
  await fetch(`${API}/watchlist/${id}`, { method: "PUT", headers: authHeaders() });
  loadWatchlist();
}

/* ── RECOMMENDATIONS ───────────────────────────── */
async function loadRecommendations(refresh = false) {
  if (isLoading) return;
  isLoading = true;

  if (refresh) { recPage++; if (recPage > 10) recPage = 1; }

  const container = document.getElementById("recommendations");
  const empty     = document.getElementById("rec-empty");
  showSkeletons(container, 12);

  try {
    const url = `${API}/movies/recommend?page=${recPage}${currentMood ? `&mood=${currentMood}` : ""}`;

    const headers = currentUser ? authHeaders() : {};
    const [recRes, wlRes] = await Promise.all([
      fetch(url),
      currentUser
        ? fetch(`${API}/watchlist`, { headers: authHeaders() })
        : Promise.resolve({ json: () => [] })
    ]);

    const movies    = await recRes.json();
    const watchlist = currentUser ? await wlRes.json() : [];

    container.innerHTML = "";

    if (!movies || movies.length === 0) {
      empty.classList.remove("hidden");
      isLoading = false;
      return;
    }
    empty.classList.add("hidden");
    movies.forEach(m => container.appendChild(buildCard(m, Array.isArray(watchlist) ? watchlist : [])));
  } catch {
    container.innerHTML = "";
    empty.textContent = "Could not load recommendations.";
    empty.classList.remove("hidden");
  }

  isLoading = false;
}

/* ── DETAILS MODAL ─────────────────────────────── */
async function showDetails(id) {
  const overlay = document.getElementById("modal-overlay");
  const content = document.getElementById("modal-content");
  overlay.classList.remove("hidden");
  content.innerHTML = `<div style="padding:60px;text-align:center;color:var(--muted)">Loading…</div>`;

  try {
    const res = await fetch(`${API}/movies/details/${id}`);
    const m   = await res.json();

    const poster = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null;
    const genres = (m.genres || []).map(g => `<span class="genre-tag">${g.name}</span>`).join("");
    const year   = m.release_date ? m.release_date.slice(0, 4) : "";
    const runtime = m.runtime ? `${m.runtime} min` : "";

    content.innerHTML = `
      ${poster ? `<img class="modal-poster" src="${poster}" alt="${m.title}">` : ""}
      <div class="modal-body">
        <h2 class="modal-title">${m.title}</h2>
        <div class="modal-meta">
          ${year    ? `<span>📅 ${year}</span>` : ""}
          ${runtime ? `<span>⏱ ${runtime}</span>` : ""}
          <span><span class="star">★</span> ${m.vote_average?.toFixed(1) ?? "N/A"}</span>
          ${m.vote_count ? `<span>${m.vote_count.toLocaleString()} votes</span>` : ""}
        </div>
        ${m.overview ? `<p class="modal-overview">${m.overview}</p>` : ""}
        ${genres    ? `<div class="modal-genres">${genres}</div>` : ""}
      </div>
    `;
  } catch {
    content.innerHTML = `<div style="padding:40px;color:var(--muted)">Failed to load details.</div>`;
  }
}

function closeModal(e) {
  if (!e || e.target === document.getElementById("modal-overlay")) {
    document.getElementById("modal-overlay").classList.add("hidden");
  }
}

/* ── CARD BUILDERS ─────────────────────────────── */
function buildCard(movie, watchlist) {
  const div    = document.createElement("div");
  div.className = "card";

  const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : null;
  const added  = watchlist.some(w => w.movieId === movie.id);
  const rating = movie.vote_average?.toFixed(1) ?? "";

  div.innerHTML = `
    ${poster ? `<img src="${poster}" alt="${movie.title}" loading="lazy">` : `<div class="no-poster">🎬</div>`}
    ${rating ? `<div class="rating">★ ${rating}</div>` : ""}
    <div class="card-overlay">
      <p class="card-title">${movie.title}</p>
      <div class="card-actions">
        <button class="btn-add" ${added ? "disabled" : ""}
          onclick="handleAdd(this, ${movie.id}, \`${esc(movie.title)}\`, \`${movie.poster_path}\`, ${movie.vote_average})">
          ${added ? "✓ Saved" : "+ Add"}
        </button>
        <button class="btn-info" onclick="showDetails(${movie.id})">Info</button>
      </div>
    </div>
  `;
  return div;
}

function buildWatchlistCard(movie) {
  const div    = document.createElement("div");
  div.className = "card";

  const poster = movie.poster ? `https://image.tmdb.org/t/p/w300${movie.poster}` : null;

  div.innerHTML = `
    ${poster ? `<img src="${poster}" alt="${movie.title}" loading="lazy">` : `<div class="no-poster">🎬</div>`}
    <div class="card-overlay">
      <p class="card-title">${movie.title}</p>
      <div class="card-actions">
        <button class="btn-fav ${movie.favorite ? 'active' : ''}" onclick="toggleFavorite('${movie._id}')">
          ${movie.favorite ? "♥" : "♡"}
        </button>
        <button class="btn-info" onclick="showDetails(${movie.movieId})">Info</button>
        <button class="btn-remove" onclick="removeMovie('${movie._id}')">✕</button>
      </div>
    </div>
  `;
  return div;
}

/* ── HELPERS ───────────────────────────────────── */
function showSkeletons(container, n) {
  container.innerHTML = Array(n).fill(`<div class="skeleton"></div>`).join("");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  t.classList.add("show");
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.classList.add("hidden"), 350);
  }, 2500);
}

function esc(str) {
  return String(str).replace(/`/g, "'").replace(/\\/g, "");
}

/* ── INIT ──────────────────────────────────────── */
window.addEventListener("load", async () => {
  await checkAuth();
  loadWatchlist();
  loadRecommendations();
});
