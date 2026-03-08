// src/App.jsx
import { useMemo, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import EntryPage from "./pages/EntryPage.jsx";
import { useWiki } from "./store/wikiStore.jsx";

function App() {
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
            <Link className="topbar-link" to="/">
              Home
            </Link>
            <Link className="topbar-link" to="/entries">
              Entries
            </Link>
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="page-container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/entries" element={<EntryListPage />} />
            <Route path="/entry/:entryId" element={<EntryPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function EntryListPage() {
  const { entries } = useWiki();
  const [search, setSearch] = useState("");

  const entriesArray = Object.values(entries);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return entriesArray;

    return entriesArray.filter((entry) => {
      const title = (entry.title || "").toLowerCase();
      const type = (entry.type || "").toLowerCase();
      return title.includes(query) || type.includes(query);
    });
  }, [entriesArray, search]);

  return (
    <div className="page">
      <h2 className="page-title">All Entries</h2>

      <div className="page-toolbar">
        <input
          className="fantasy-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entries by title or type..."
        />
      </div>

      {filteredEntries.length === 0 && <p>No matching entries found.</p>}

      {filteredEntries.length > 0 && (
        <ul className="entry-list">
          {filteredEntries.map((entry) => (
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