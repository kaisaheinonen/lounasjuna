const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_FILE = path.join(__dirname, "data", "lounasjuna.db");
const db = new Database(DB_FILE);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trains (
    id INTEGER PRIMARY KEY,
    departure_location TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    restaurant_id INTEGER NOT NULL,
    organizer_name TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS train_participants (
    id INTEGER PRIMARY KEY,
    train_id INTEGER NOT NULL REFERENCES trains(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Lisätään unique-indeksi äänestyksille (yksi ääni per käyttäjä/ravintola/päivä)
try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_unique ON votes (restaurant_id, user_id, date)");
} catch (e) {
  // indeksi saattaa jo olla olemassa
}

// Migroi käyttäjät users.json → SQLite jos taulu on tyhjä
const USERS_FILE = path.join(__dirname, "data", "users.json");
try {
  const count = db.prepare("SELECT COUNT(*) as n FROM users").get().n;
  if (count === 0 && fs.existsSync(USERS_FILE)) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    const insert = db.prepare(
      "INSERT OR IGNORE INTO users (id, username, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    const migrate = db.transaction((list) => {
      for (const u of list) {
        insert.run(u.id, u.username, u.displayName, u.passwordHash, u.createdAt);
      }
    });
    migrate(users);
    if (users.length > 0) {
      console.log(`Migrated ${users.length} user(s) from users.json → SQLite`);
    }
  }
} catch (e) {
  console.error("Käyttäjien migraatio epäonnistui:", e.message);
}

module.exports = db;
