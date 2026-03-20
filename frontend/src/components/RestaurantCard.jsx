import { useState } from "react";

const DIET_LABELS = {
  L: { label: "L", title: "Laktoositon" },
  G: { label: "G", title: "Gluteeniton" },
  M: { label: "M", title: "Maidoton" },
  V: { label: "V", title: "Vegaani" },
};

function formatPrice(price) {
  if (price == null) return null;
  if (typeof price === "number") return `${price.toFixed(2)} €`;
  return String(price).replace("e", " €");
}

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

  // Support both mock data (cuisine) and live data (hours)
  const metaParts = [
    restaurant.address,
    restaurant.distance,
    restaurant.hours ? `🕐 ${restaurant.hours}` : restaurant.cuisine,
  ].filter(Boolean);

  return (
    <div className={`restaurant-card ${voteCount > 0 ? "has-votes" : ""}`}>
      <div className="restaurant-header" onClick={() => setExpanded(!expanded)}>
        <div className="restaurant-info">
          <h3>{restaurant.name}</h3>
          <span className="restaurant-meta">{metaParts.join(" · ")}</span>
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
            {restaurant.menu.map((item) => {
              const diets = item.diets || item.tags || [];
              const price = formatPrice(item.price);
              return (
                <li key={item.id} className="menu-item">
                  <span className="menu-name">{item.name}</span>
                  <div className="menu-right">
                    {price && <span className="menu-price">{price}</span>}
                    {diets.length > 0 && (
                      <div className="menu-tags">
                        {diets.map((d) => {
                          const info = DIET_LABELS[d];
                          return info ? (
                            <span key={d} className="tag tag-diet" title={info.title}>
                              {info.label}
                            </span>
                          ) : (
                            <span key={d} className={`tag tag-${d}`}>{d}</span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
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
