import { useState } from "react";

const TAG_LABELS = {
  liha: "🥩 Liha",
  kala: "🐟 Kala",
  kasvis: "🥦 Kasvis",
  vegaani: "🌱 Vegaani",
};

export default function RestaurantCard({ restaurant, votes, onVote }) {
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [voterName, setVoterName] = useState("");
  const [expanded, setExpanded] = useState(false);

  const voteCount = votes ? votes.length : 0;

  const handleVoteSubmit = () => {
    onVote(restaurant.id, voterName.trim() || "Anonyymi");
    setVoterName("");
    setShowVoteModal(false);
  };

  return (
    <div className={`restaurant-card ${voteCount > 0 ? "has-votes" : ""}`}>
      <div className="restaurant-header" onClick={() => setExpanded(!expanded)}>
        <div className="restaurant-info">
          <h3>{restaurant.name}</h3>
          <span className="restaurant-meta">
            📍 {restaurant.address} · {restaurant.distance} · {restaurant.cuisine}
          </span>
        </div>
        <div className="restaurant-actions">
          <button
            className="vote-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowVoteModal(true);
            }}
            title="Äänestä tätä ravintolaa"
          >
            👍 <span className="vote-count">{voteCount}</span>
          </button>
          <span className="expand-icon">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {voteCount > 0 && (
        <div className="voters">
          {votes.map((v, i) => (
            <span key={i} className="voter-chip">
              {v.name}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="menu-list">
          <h4>Päivän lounaslista</h4>
          <ul>
            {restaurant.menu.map((item) => (
              <li key={item.id} className="menu-item">
                <span className="menu-name">{item.name}</span>
                <div className="menu-right">
                  <span className="menu-price">{item.price.toFixed(2)} €</span>
                  <div className="menu-tags">
                    {item.tags.map((tag) => (
                      <span key={tag} className={`tag tag-${tag}`}>
                        {TAG_LABELS[tag]}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showVoteModal && (
        <div className="modal-overlay" onClick={() => setShowVoteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Äänestä ravintolaa</h3>
            <p>
              <strong>{restaurant.name}</strong>
            </p>
            <input
              type="text"
              placeholder="Nimesi (valinnainen)"
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVoteSubmit()}
              autoFocus
              maxLength={50}
            />
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleVoteSubmit}>
                👍 Äänestä
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowVoteModal(false)}
              >
                Peruuta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
