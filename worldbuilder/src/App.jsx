// src/App.jsx
import { Routes, Route, Link, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import EntryPage from "./pages/EntryPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { useWiki } from "./store/wikiStore.jsx";
import { useAuth } from "./store/authStore.jsx";

function App() {
  const { user, authLoading, logout } = useAuth();

  if (authLoading) {
    return (
      <div className="app">
        <main className="main">
          <div className="page-container">
            <div className="page">
              <p>Loading…</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <h1 className="topbar-title">
              <Link to="/" className="topbar-title-link">
                Campaign Wiki
              </Link>
            </h1>
          </div>

          <nav className="topbar-nav">
            {user ? (
              <>
                <Link className="topbar-link" to="/">
                  Home
                </Link>
                <Link className="topbar-link" to="/entries">
                  Entries
                </Link>
                <button className="fantasy-button secondary topbar-button" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <Link className="topbar-link" to="/login">
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="page-container">
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" replace /> : <LoginPage />}
            />

            <Route
              path="/"
              element={
                <ProtectedRoute user={user}>
                  <HomePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/entries"
              element={
                <ProtectedRoute user={user}>
                  <EntryListPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/entry/:entryId"
              element={
                <ProtectedRoute user={user}>
                  <EntryPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function EntryListPage() {
  const { entries } = useWiki();
  const entriesArray = Object.values(entries);

  return (
    <div className="page">
      <h2 className="page-title">All Entries</h2>

      {entriesArray.length === 0 && <p>No entries yet.</p>}

      {entriesArray.length > 0 && (
        <ul className="entry-list">
          {entriesArray.map((entry) => (
            <li key={entry.id} className="entry-list-item">
              <Link to={`/entry/${entry.id}`} className="entry-link">
                {entry.title}
              </Link>
              <span className="entry-type-label">({entry.type})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;