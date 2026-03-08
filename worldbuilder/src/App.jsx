// src/App.jsx
import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import EntryPage from "./pages/EntryPage.jsx";
import { useWiki } from "./store/wikiStore.jsx";

function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1>Campaign Wiki</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/entries" style={{ marginLeft: "1rem" }}>
            Entries
          </Link>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/entries" element={<EntryListPage />} />
          <Route path="/entry/:entryId" element={<EntryPage />} />
        </Routes>
      </main>
    </div>
  );
}

function EntryListPage() {
  const { entries } = useWiki();
  const entriesArray = Object.values(entries);

  return (
    <div className="page">
      <h2>All Entries</h2>
      {entriesArray.length === 0 && <p>No entries yet.</p>}
      {entriesArray.length > 0 && (
        <ul>
          {entriesArray.map((entry) => (
            <li key={entry.id}>
              <Link to={`/entry/${entry.id}`}>{entry.title}</Link>{" "}
              <span style={{ opacity: 0.6 }}>({entry.type})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;