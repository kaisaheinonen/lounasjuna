import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ username: "", password: "", displayName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.username, form.password);
      } else {
        await register(form.username, form.password, form.displayName);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>🚂 Lounasjuna</h1>
          <p>Toimiston lounasorganisaattori</p>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Kirjaudu sisään
          </button>
          <button
            className={`login-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => { setMode("register"); setError(""); }}
          >
            Luo tunnus
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === "register" && (
            <label>
              Näyttönimi
              <input
                type="text"
                placeholder="esim. Kaisa H."
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                maxLength={50}
                autoComplete="name"
              />
            </label>
          )}
          <label>
            Käyttäjätunnus
            <input
              type="text"
              placeholder="esim. kaisa.h"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              maxLength={30}
              required
              autoComplete="username"
              autoFocus
            />
          </label>
          <label>
            Salasana
            <input
              type="password"
              placeholder={mode === "register" ? "Vähintään 4 merkkiä" : ""}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button className="btn-primary login-submit" type="submit" disabled={loading}>
            {loading ? "Odota..." : mode === "login" ? "Kirjaudu" : "Luo tunnus"}
          </button>
        </form>
      </div>
    </div>
  );
}
