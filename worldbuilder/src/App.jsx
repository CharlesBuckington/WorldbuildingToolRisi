import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import MapPage from "./pages/MapPage.jsx";

function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1>World Builder</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/map">Map</Link>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;