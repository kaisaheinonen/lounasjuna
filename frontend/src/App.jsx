import { useState, useEffect, useCallback } from "react";
import RestaurantList from "./components/RestaurantList";
import LunchTrainSection from "./components/LunchTrainSection";
import './App.css'

const API_BASE = "http://localhost:3001/api";

const POLL_INTERVAL = 5000;

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("restaurants");

  const [votes, setVotes] = useState({});
  const [trains, setTrains] = useState([]);

  const fetchSharedData = useCallback(() => {
    Promise.all([
      fetch(`${API_BASE}/votes`).then((r) => r.json()),
      fetch(`${API_BASE}/trains`).then((r) => r.json()),
    ]).then(([v, t]) => {
      setVotes(v);
      setTrains(t);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/restaurants`)
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

    fetchSharedData();
    const timer = setInterval(fetchSharedData, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchSharedData]);

  const handleVote = async (restaurantId, name) => {
    const res = await fetch(`${API_BASE}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, name }),
    });
    if (res.ok) fetchSharedData();
  };

  const handleCreateTrain = async (formData) => {
    const res = await fetch(`${API_BASE}/trains`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) fetchSharedData();
  };

  const handleJoinTrain = async (trainId, name) => {
    const res = await fetch(`${API_BASE}/trains/${trainId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) fetchSharedData();
  };

  const handleLeaveTrain = async (trainId, participantId) => {
    const res = await fetch(`${API_BASE}/trains/${trainId}/participants/${participantId}`, {
      method: "DELETE",
    });
    if (res.ok) fetchSharedData();
  };

  const dateLabel = new Date().toLocaleDateString("fi-FI", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const trainCount = trains.filter((t) => {
    const [h, m] = t.departureTime.split(":").map(Number);
    const trainTime = new Date();
    trainTime.setHours(h, m, 0, 0);
    return trainTime >= new Date();
  }).length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🚂 Lounasjuna</h1>
          <p className="date-label">{dateLabel}</p>
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
          />
        )}
      </main>
    </div>
  );
}

export default App;
