import RestaurantCard from "./RestaurantCard";

export default function RestaurantList({ restaurants, votes, onVote, loading, error }) {
  if (loading) {
    return <div className="loading">Ladataan ravintoloita... 🍽️</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>⚠️ Ravintolatietoja ei saatu ladattua.</p>
        <p className="error-detail">{error}</p>
      </div>
    );
  }

  const sorted = [...restaurants].sort((a, b) => {
    const aVotes = votes[a.id] ? votes[a.id].length : 0;
    const bVotes = votes[b.id] ? votes[b.id].length : 0;
    return bVotes - aVotes;
  });

  const totalVotes = Object.values(votes).reduce(
    (sum, v) => sum + v.length,
    0
  );

  return (
    <div className="restaurant-list">
      {totalVotes > 0 && (
        <p className="vote-summary">
          🗳️ Yhteensä <strong>{totalVotes}</strong> ääntä annettu tänään
        </p>
      )}
      {sorted.map((r, index) => (
        <div key={r.id} className="restaurant-wrapper">
          {index === 0 && votes[r.id] && votes[r.id].length > 0 && (
            <div className="top-pick-badge">🏆 Eniten ääniä</div>
          )}
          <RestaurantCard
            restaurant={r}
            votes={votes[r.id] || []}
            onVote={onVote}
          />
        </div>
      ))}
    </div>
  );
}
