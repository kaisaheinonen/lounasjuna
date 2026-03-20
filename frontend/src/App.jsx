import { useState, useEffect, useCallback } from "react";
import RestaurantList from "./components/RestaurantList";
import LunchTrainSection from "./components/LunchTrainSection";
import LoginPage from "./components/LoginPage";
import { useAuth } from "./contexts/AuthContext";
import './App.css'

const API_BASE = "http://localhost:3001/api";

const POLL_INTERVAL = 5000;

// Päivämääräapufunktiot (paikalliset, ei timezone-ongelmia)
const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayISO = () => toISO(new Date());
const addDays = (isoDate, n) => {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
};
const getNextMonday = () => {
  const today = new Date();
  const d = today.getDay(); // 0=su..6=la
  const daysUntil = d === 0 ? 1 : 8 - d; // su→1, ma→7, ti→6, ..., la→2
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return toISO(next);
};
const formatDateFI = (isoDate) => {
  const t = todayISO();
  if (isoDate === t) return "Tänään";
  if (isoDate === addDays(t, 1)) return "Huomenna";
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("fi-FI", { weekday: "long", day: "numeric", month: "long" });
};

function App() {
  const { user, loading: authLoading, logout, getAuthHeaders } = useAuth();

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("restaurants");

  const [votes, setVotes] = useState({});
  const [trains, setTrains] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayISO);

  const fetchSharedData = useCallback(() => {
    Promise.all([
      fetch(`${API_BASE}/votes?date=${selectedDate}`).then((r) => r.json()),
      fetch(`${API_BASE}/trains?date=${selectedDate}`).then((r) => r.json()),
    ]).then(([v, t]) => {
      setVotes(v);
      setTrains(t);
    }).catch(() => {});
  }, [selectedDate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`${API_BASE}/restaurants?date=${selectedDate}`)
      .then((res) => {
        if (!res.ok) throw new Error("Palvelinvirhe");
        return res.json();
      })
      .then((data) => {
        setRestaurants(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [user, selectedDate]);

  useEffect(() => {
    if (!user) return;
    fetchSharedData();
    const timer = setInterval(fetchSharedData, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchSharedData, user]);

  const handleVote = async (restaurantId) => {
    const res = await fetch(`${API_BASE}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ restaurantId, name: user.displayName, date: selectedDate }),
    });
    if (res.ok) fetchSharedData();
  };

  const handleCreateTrain = async (formData) => {
    const res = await fetch(`${API_BASE}/trains`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ ...formData, organizerName: user.displayName, date: selectedDate }),
    });
    if (res.ok) fetchSharedData();
  };

  const handleJoinTrain = async (trainId) => {
    const res = await fetch(`${API_BASE}/trains/${trainId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ name: user.displayName }),
    });
    if (res.ok) fetchSharedData();
  };

  const handleLeaveTrain = async (trainId, participantId) => {
    const res = await fetch(`${API_BASE}/trains/${trainId}/participants/${participantId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (res.ok) fetchSharedData();
  };

  if (authLoading) return <div className="loading">Ladataan... 🚂</div>;
  if (!user) return <LoginPage />;

  const isToday = selectedDate === todayISO();

  const trainCount = isToday
    ? trains.filter((t) => {
        const [h, m] = t.departureTime.split(":").map(Number);
        const trainTime = new Date();
        trainTime.setHours(h, m, 0, 0);
        return trainTime >= new Date();
      }).length
    : trains.length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🚂 Lounasjuna</h1>
          <div className="date-nav">
            <button
              className="date-nav-btn"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              disabled={selectedDate <= todayISO()}
              aria-label="Edellinen päivä"
            >‹</button>
            <span className="date-nav-label">{formatDateFI(selectedDate)}</span>
            {!isToday && (
              <button className="date-nav-today" onClick={() => setSelectedDate(todayISO())}>
                Tänään
              </button>
            )}
            <button
              className="date-nav-btn"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              disabled={selectedDate >= getNextMonday()}
              aria-label="Seuraava päivä"
            >›</button>
          </div>
        </div>
        <div className="header-user">
          <span className="header-username">👤 {user.displayName}</span>
          <button className="logout-btn" onClick={logout}>Kirjaudu ulos</button>
        </div>
      </header>

      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === "restaurants" ? "active" : ""}`}
          onClick={() => setActiveTab("restaurants")}
        >
          🍽️ Lounaspaikat
        </button>
        <button
          className={`tab-btn ${activeTab === "trains" ? "active" : ""}`}
          onClick={() => setActiveTab("trains")}
        >
          🚂 Lounasjunat
          {trainCount > 0 && <span className="tab-badge">{trainCount}</span>}
        </button>
      </nav>

      <main className="main-content">
        {activeTab === "restaurants" && (
          <RestaurantList
            restaurants={restaurants}
            votes={votes}
            onVote={handleVote}
            loading={loading}
            error={error}
          />
        )}
        {activeTab === "trains" && (
          <LunchTrainSection
            trains={trains}
            restaurants={restaurants}
            onCreateTrain={handleCreateTrain}
            onJoinTrain={handleJoinTrain}
            onLeaveTrain={handleLeaveTrain}
            currentUser={user}
            isToday={isToday}
          />
        )}
      </main>
    </div>
  );
}

export default App;
