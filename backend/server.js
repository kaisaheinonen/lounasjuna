const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const restaurants = require("./data/restaurants");
const { fetchLounaat } = require("./scraper/lounaat");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ===== Lounaat.info cache (päivitetään kerran tunnissa) =====
let liveCache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 tunti

async function getLiveRestaurants() {
  const now = Date.now();
  if (!liveCache.data || now - liveCache.fetchedAt > CACHE_TTL_MS) {
    console.log("Haetaan lounaat.info...");
    liveCache.data = await fetchLounaat();
    liveCache.fetchedAt = now;
    console.log(`Haettu ${liveCache.data.length} ravintolaa`);
  }
  return liveCache.data;
}

// ===== Persistent JSON storage =====
const DATA_FILE = path.join(__dirname, "data", "state.json");

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Tilan lataus epäonnistui, aloitetaan tyhjältä:", e.message);
  }
  return { votes: {}, trains: {} };
}

function saveState(state) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    console.error("Tilan tallennus epäonnistui:", e.message);
  }
}

let state = loadState();

const todayKey = () => new Date().toISOString().slice(0, 10);

// ===== Restaurants =====

// GET /api/restaurants — palauttaa lounaat.info-datan, fallback mock-dataan
app.get("/api/restaurants", async (req, res) => {
  try {
    const data = await getLiveRestaurants();
    res.json(data);
  } catch (err) {
    console.error("lounaat.info haku epäonnistui, käytetään mock-dataa:", err.message);
    res.json(restaurants);
  }
});

// GET /api/restaurants/refresh — pakota uusi haku (ohittaa cachen)
app.post("/api/restaurants/refresh", async (req, res) => {
  liveCache = { data: null, fetchedAt: 0 };
  try {
    const data = await getLiveRestaurants();
    res.json({ ok: true, count: data.length });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ===== Votes =====

// GET /api/votes?date=YYYY-MM-DD  (defaults to today)
app.get("/api/votes", (req, res) => {
  const date = req.query.date || todayKey();
  res.json(state.votes[date] || {});
});

// POST /api/votes  { restaurantId, name }
app.post("/api/votes", (req, res) => {
  const { restaurantId, name } = req.body;
  if (!restaurantId || typeof restaurantId !== "number") {
    return res.status(400).json({ error: "restaurantId puuttuu tai ei ole numero" });
  }
  const safeName = (typeof name === "string" ? name.trim().slice(0, 50) : "") || "Anonyymi";
  const date = todayKey();

  if (!state.votes[date]) state.votes[date] = {};
  if (!state.votes[date][restaurantId]) state.votes[date][restaurantId] = [];

  const vote = { name: safeName, timestamp: Date.now() };
  state.votes[date][restaurantId].push(vote);
  saveState(state);

  res.status(201).json(vote);
});

// ===== Trains =====

// GET /api/trains?date=YYYY-MM-DD  (defaults to today)
app.get("/api/trains", (req, res) => {
  const date = req.query.date || todayKey();
  res.json(state.trains[date] || []);
});

// POST /api/trains  { departureLocation, departureTime, restaurantId, organizerName }
app.post("/api/trains", (req, res) => {
  const { departureLocation, departureTime, restaurantId, organizerName } = req.body;
  if (!departureLocation || !departureTime || !restaurantId) {
    return res.status(400).json({ error: "Pakollisia kenttiä puuttuu" });
  }
  const safeName = (typeof organizerName === "string" ? organizerName.trim().slice(0, 50) : "") || "Anonyymi";
  const date = todayKey();

  const participantId = Date.now();
  const newTrain = {
    id: participantId,
    departureLocation: String(departureLocation).slice(0, 100),
    departureTime: String(departureTime).slice(0, 5),
    restaurantId: parseInt(restaurantId),
    organizerName: safeName,
    participants: [{ id: participantId, name: safeName, timestamp: participantId }],
    createdAt: participantId,
  };

  if (!state.trains[date]) state.trains[date] = [];
  state.trains[date].push(newTrain);
  saveState(state);

  res.status(201).json(newTrain);
});

// POST /api/trains/:id/join  { name }
app.post("/api/trains/:id/join", (req, res) => {
  const trainId = parseInt(req.params.id);
  const safeName = (typeof req.body.name === "string" ? req.body.name.trim().slice(0, 50) : "") || "Anonyymi";
  const date = todayKey();

  const trains = state.trains[date] || [];
  const train = trains.find((t) => t.id === trainId);
  if (!train) {
    return res.status(404).json({ error: "Junaa ei löydy" });
  }

  const participant = { id: Date.now(), name: safeName, timestamp: Date.now() };
  train.participants.push(participant);
  saveState(state);

  res.status(201).json(participant);
});

// DELETE /api/trains/:id/participants/:participantId
app.delete("/api/trains/:id/participants/:participantId", (req, res) => {
  const trainId = parseInt(req.params.id);
  const participantId = parseInt(req.params.participantId);
  const date = todayKey();

  const trains = state.trains[date] || [];
  const train = trains.find((t) => t.id === trainId);
  if (!train) {
    return res.status(404).json({ error: "Junaa ei löydy" });
  }

  const before = train.participants.length;
  train.participants = train.participants.filter((p) => p.id !== participantId);
  if (train.participants.length === before) {
    return res.status(404).json({ error: "Osallistujaa ei löydy" });
  }

  saveState(state);
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Lounasjuna backend käynnissä portissa ${PORT}`);
});
