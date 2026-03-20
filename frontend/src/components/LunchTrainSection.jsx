import { useState } from "react";

export default function LunchTrainSection({ trains, restaurants, onCreateTrain, onJoinTrain, onLeaveTrain }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    departureLocation: "",
    departureTime: "",
    restaurantId: "",
    organizerName: "",
  });
  const [joiningTrain, setJoiningTrain] = useState(null);
  const [joinerName, setJoinerName] = useState("");

  const now = new Date();
  const activeTrains = trains.filter((t) => {
    const [h, m] = t.departureTime.split(":").map(Number);
    const trainTime = new Date();
    trainTime.setHours(h, m, 0, 0);
    return trainTime >= now;
  });

  const handleCreate = () => {
    if (!form.departureLocation || !form.departureTime || !form.restaurantId) {
      return;
    }
    onCreateTrain({
      ...form,
      organizerName: form.organizerName.trim() || "Anonyymi",
      restaurantId: parseInt(form.restaurantId),
    });
    setForm({ departureLocation: "", departureTime: "", restaurantId: "", organizerName: "" });
    setShowForm(false);
  };

  const handleJoin = (trainId) => {
    onJoinTrain(trainId, joinerName.trim() || "Anonyymi");
    setJoinerName("");
    setJoiningTrain(null);
  };

  const getRestaurantName = (id) => {
    const r = restaurants.find((r) => r.id === id);
    return r ? r.name : "Tuntematon ravintola";
  };

  return (
    <div className="lunch-train-section">
      <div className="section-header">
        <h2>🚂 Lounasjunat</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Peruuta" : "+ Uusi lounasjuna"}
        </button>
      </div>

      {showForm && (
        <div className="train-form">
          <h3>Aloita lounasjuna</h3>
          <div className="form-grid">
            <label>
              Lähtöpaikka
              <input
                type="text"
                placeholder="esim. Toimiston aula, 2. krs"
                value={form.departureLocation}
                onChange={(e) =>
                  setForm({ ...form, departureLocation: e.target.value })
                }
                maxLength={100}
              />
            </label>
            <label>
              Lähtöaika
              <input
                type="time"
                value={form.departureTime}
                onChange={(e) =>
                  setForm({ ...form, departureTime: e.target.value })
                }
              />
            </label>
            <label>
              Kohde
              <select
                value={form.restaurantId}
                onChange={(e) =>
                  setForm({ ...form, restaurantId: e.target.value })
                }
              >
                <option value="">Valitse ravintola...</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.distance})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nimesi
              <input
                type="text"
                placeholder="Valinnainen"
                value={form.organizerName}
                onChange={(e) =>
                  setForm({ ...form, organizerName: e.target.value })
                }
                maxLength={50}
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              className="btn-primary"
              onClick={handleCreate}
              disabled={
                !form.departureLocation ||
                !form.departureTime ||
                !form.restaurantId
              }
            >
              🚂 Käynnistä juna
            </button>
          </div>
        </div>
      )}

      {activeTrains.length === 0 ? (
        <div className="empty-trains">
          <p>Ei aktiivisia lounasjunia tänään.</p>
          <p>Aloita ensimmäinen! 🚂</p>
        </div>
      ) : (
        <div className="trains-list">
          {activeTrains.map((train) => (
            <div key={train.id} className="train-card">
              <div className="train-header">
                <div className="train-route">
                  <span className="train-from">📍 {train.departureLocation}</span>
                  <span className="train-arrow">→</span>
                  <span className="train-to">
                    🍽️ {getRestaurantName(train.restaurantId)}
                  </span>
                </div>
                <div className="train-time">🕐 {train.departureTime}</div>
              </div>
              <div className="train-passengers">
                <span className="passengers-label">Matkustajat:</span>
                {train.participants.map((p) => (
                  <span key={p.id} className="passenger-chip">
                    {p.name}
                    <button
                      className="leave-btn"
                      onClick={() => onLeaveTrain(train.id, p.id)}
                      title={`Poista ${p.name} junasta`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  className="join-btn"
                  onClick={() => setJoiningTrain(train.id)}
                >
                  + Liity
                </button>
              </div>

              {joiningTrain === train.id && (
                <div className="join-form">
                  <input
                    type="text"
                    placeholder="Nimesi (valinnainen)"
                    value={joinerName}
                    onChange={(e) => setJoinerName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin(train.id)}
                    autoFocus
                    maxLength={50}
                  />
                  <button
                    className="btn-primary"
                    onClick={() => handleJoin(train.id)}
                  >
                    🚂 Hyppää kyytiin
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setJoiningTrain(null)}
                  >
                    Peruuta
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
