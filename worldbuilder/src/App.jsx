// src/App.jsx
import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import MapPage from "./pages/MapPage.jsx";
import SitePage from "./pages/SitePage.jsx";
import { useWorld } from "./store/worldStore.jsx";

function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1>World Builder</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/map" style={{ marginLeft: "1rem" }}>
            Maps
          </Link>
          <Link to="/sites" style={{ marginLeft: "1rem" }}>
            Sites
          </Link>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/map/:mapId" element={<MapPage />} />
          <Route path="/site/:siteId" element={<SitePage />} />
          <Route path="/sites" element={<SitePageListWrapper />} />
        </Routes>
      </main>
    </div>
  );
}

// List of all sites
function SitePageListWrapper() {
  const { sites } = useWorld();
  const sitesArray = Object.values(sites);

  return (
    <div className="page">
      <h2>All Sites</h2>
      {sitesArray.length === 0 && <p>No sites yet.</p>}
      {sitesArray.length > 0 && (
        <ul>
          {sitesArray.map((site) => (
            <li key={site.id}>
              <Link to={`/site/${site.id}`}>{site.title}</Link>{" "}
              <span style={{ opacity: 0.6 }}>({site.type})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;