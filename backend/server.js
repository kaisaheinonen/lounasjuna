const express = require("express");
const cors = require("cors");
const restaurants = require("./data/restaurants");
const { fetchLounaat } = require("./scraper/lounaat");
const { registerRoutes: registerAuthRoutes, authenticateToken } = require("./auth/auth");
const db = require("./db");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Auth routes
registerAuthRoutes(app);

// ===== Lounaat.info cache (per päivä, TTL 1h) =====
const liveCache = new Map(); // key: date-string, value: { data, fetchedAt }
const CACHE_TTL_MS = 60 * 60 * 1000;

async function getLiveRestaurants(date) {
  const now = Date.now();
  const cached = liveCache.get(date);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }
  console.log(`Haetaan lounaat.info (${date})...`);
  const data = await fetchLounaat(date);
  liveCache.set(date, { data, fetchedAt: now });
  console.log(`Haettu ${data.length} ravintolaa päivälle ${date}`);
  return data;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

// Apufunktio: muodostaa junaobjektin tietokantariveistä
function buildTrain(t, participants) {
  return {
    id: t.id,
    departureLocation: t.departure_location,
    departureTime: t.departure_time,
    restaurantId: t.restaurant_id,
    organizerName: t.organizer_name,
    participants: participants.map((p) => ({
      id: p.id,
      name: p.display_name,
      userId: p.user_id,
      timestamp: p.created_at,
    })),
    createdAt: t.created_at,
  };
}

// ===== Restaurants =====

// GET /api/restaurants?date=YYYY-MM-DD — palauttaa lounaat.info-datan, fallback mock-dataan
app.get("/api/restaurants", async (req, res) => {
  const date = req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
    ? req.query.date
    : todayKey();
  try {
    const data = await getLiveRestaurants(date);
    res.json(data);
  } catch (err) {
    console.error("lounaat.info haku epäonnistui, käytetään mock-dataa:", err.message);
    res.json(restaurants);
  }
});

// POST /api/restaurants/refresh?date=YYYY-MM-DD — pakota uusi haku (ohittaa cachen)
app.post("/api/restaurants/refresh", async (req, res) => {
  const date = req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
    ? req.query.date
    : todayKey();
  liveCache.delete(date);
  try {
    const data = await getLiveRestaurants(date);
    res.json({ ok: true, count: data.length });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ===== Votes =====

// GET /api/votes?date=YYYY-MM-DD  (defaults to today)
app.get("/api/votes", (req, res) => {
  const date = req.query.date || todayKey();
  const rows = db.prepare(
    "SELECT restaurant_id, display_name, created_at FROM votes WHERE date = ?"
  ).all(date);
  const result = {};
  for (const row of rows) {
    const key = String(row.restaurant_id);
    if (!result[key]) result[key] = [];
    result[key].push({ name: row.display_name, timestamp: row.created_at });
  }
  res.json(result);
});

// POST /api/votes  { restaurantId, name, date? }
app.post("/api/votes", (req, res) => {
  const { restaurantId, name } = req.body;
  if (!restaurantId || typeof restaurantId !== "number") {
    return res.status(400).json({ error: "restaurantId puuttuu tai ei ole numero" });
  }
  const safeName = (typeof name === "string" ? name.trim().slice(0, 50) : "") || "Anonyymi";
  const today = todayKey();
  const rawDate = typeof req.body.date === "string" ? req.body.date : today;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate >= today ? rawDate : today;
  const now = Date.now();
  const userId = req.body.userId || "anon";

  db.prepare(
    "INSERT INTO votes (restaurant_id, user_id, display_name, date, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(restaurantId, userId, safeName, date, now);

  res.status(201).json({ name: safeName, timestamp: now });
});

// ===== Trains =====

// GET /api/trains?date=YYYY-MM-DD  (defaults to today)
app.get("/api/trains", (req, res) => {
  const date = req.query.date || todayKey();
  const trains = db.prepare(
    "SELECT * FROM trains WHERE date = ? ORDER BY created_at ASC"
  ).all(date);
  if (trains.length === 0) return res.json([]);

  const ids = trains.map((t) => t.id);
  const placeholders = ids.map(() => "?").join(",");
  const participants = db.prepare(
    `SELECT * FROM train_participants WHERE train_id IN (${placeholders}) ORDER BY created_at ASC`
  ).all(...ids);

  const byTrain = {};
  for (const p of participants) {
    if (!byTrain[p.train_id]) byTrain[p.train_id] = [];
    byTrain[p.train_id].push(p);
  }
  res.json(trains.map((t) => buildTrain(t, byTrain[t.id] || [])));
});

// POST /api/trains  { departureLocation, departureTime, restaurantId, organizerName, date? }
app.post("/api/trains", authenticateToken, (req, res) => {
  const { departureLocation, departureTime, restaurantId, organizerName } = req.body;
  if (!departureLocation || !departureTime || !restaurantId) {
    return res.status(400).json({ error: "Pakollisia kenttiä puuttuu" });
  }
  const safeName = (typeof organizerName === "string" ? organizerName.trim().slice(0, 50) : "") || "Anonyymi";
  const today = todayKey();
  const rawDate = typeof req.body.date === "string" ? req.body.date : today;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate >= today ? rawDate : today;
  const now = Date.now();

  db.prepare(
    "INSERT INTO trains (id, departure_location, departure_time, restaurant_id, organizer_name, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(now, String(departureLocation).slice(0, 100), String(departureTime).slice(0, 5), parseInt(restaurantId), safeName, date, now);

  db.prepare(
    "INSERT INTO train_participants (id, train_id, user_id, display_name, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(now, now, req.user.username, safeName, now);

  const train = db.prepare("SELECT * FROM trains WHERE id = ?").get(now);
  const participant = db.prepare("SELECT * FROM train_participants WHERE train_id = ?").all(now);
  res.status(201).json(buildTrain(train, participant));
});

// POST /api/trains/:id/join  { name }
app.post("/api/trains/:id/join", authenticateToken, (req, res) => {
  const trainId = parseInt(req.params.id);
  const safeName = (typeof req.body.name === "string" ? req.body.name.trim().slice(0, 50) : "") || "Anonyymi";

  const train = db.prepare("SELECT * FROM trains WHERE id = ?").get(trainId);
  if (!train) {
    return res.status(404).json({ error: "Junaa ei löydy" });
  }

  const now = Date.now();
  db.prepare(
    "INSERT INTO train_participants (id, train_id, user_id, display_name, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(now, trainId, req.user.username, safeName, now);

  res.status(201).json({ id: now, name: safeName, userId: req.user.username, timestamp: now });
});

// DELETE /api/trains/:id/participants/:participantId
app.delete("/api/trains/:id/participants/:participantId", authenticateToken, (req, res) => {
  const trainId = parseInt(req.params.id);
  const participantId = parseInt(req.params.participantId);

  const train = db.prepare("SELECT * FROM trains WHERE id = ?").get(trainId);
  if (!train) {
    return res.status(404).json({ error: "Junaa ei löydy" });
  }

  const participant = db.prepare(
    "SELECT * FROM train_participants WHERE id = ? AND train_id = ?"
  ).get(participantId, trainId);
  if (!participant) {
    return res.status(404).json({ error: "Osallistujaa ei löydy" });
  }
  if (participant.user_id !== req.user.username) {
    return res.status(403).json({ error: "Voit poistaa vain oman ilmoittautumisesi" });
  }

  db.prepare("DELETE FROM train_participants WHERE id = ?").run(participantId);
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Lounasjuna backend käynnissä portissa ${PORT}`);
});
