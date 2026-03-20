const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const USERS_FILE = path.join(__dirname, "../data/users.json");
const JWT_SECRET = process.env.JWT_SECRET || "lounasjuna-secret-change-in-prod";
const SALT_ROUNDS = 10;

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Käyttäjien lataus epäonnistui:", e.message);
  }
  return [];
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, displayName: user.displayName },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authenticateToken(req, res, next) {
  const auth = req.headers["authorization"];
  const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Kirjautuminen vaaditaan" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Virheellinen tai vanhentunut token" });
  }
}

function registerRoutes(app) {
  // POST /api/auth/register
  app.post("/api/auth/register", async (req, res) => {
    const { username, password, displayName } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Käyttäjätunnus ja salasana vaaditaan" });
    }
    const safeUsername = String(username).trim().toLowerCase().slice(0, 30);
    const safeDisplay = (typeof displayName === "string" ? displayName.trim().slice(0, 50) : "") || safeUsername;

    if (!/^[a-z0-9_.-]{2,30}$/.test(safeUsername)) {
      return res.status(400).json({ error: "Käyttäjätunnus saa sisältää vain kirjaimia a-z, numeroita ja merkkejä _ . -" });
    }
    if (String(password).length < 4) {
      return res.status(400).json({ error: "Salasanan oltava vähintään 4 merkkiä" });
    }

    const users = loadUsers();
    if (users.find((u) => u.username === safeUsername)) {
      return res.status(409).json({ error: "Käyttäjätunnus on jo käytössä" });
    }

    const hash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const user = { id: Date.now(), username: safeUsername, displayName: safeDisplay, passwordHash: hash, createdAt: Date.now() };
    users.push(user);
    saveUsers(users);

    res.status(201).json({ token: signToken(user), user: { id: user.id, username: user.username, displayName: user.displayName } });
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Käyttäjätunnus ja salasana vaaditaan" });
    }
    const users = loadUsers();
    const user = users.find((u) => u.username === String(username).trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "Väärä käyttäjätunnus tai salasana" });
    }
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Väärä käyttäjätunnus tai salasana" });
    }
    res.json({ token: signToken(user), user: { id: user.id, username: user.username, displayName: user.displayName } });
  });

  // GET /api/auth/me  (token refresh / validation)
  app.get("/api/auth/me", authenticateToken, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username, displayName: req.user.displayName });
  });
}

module.exports = { registerRoutes, authenticateToken };
