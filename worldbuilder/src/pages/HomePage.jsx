// src/pages/HomePage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorld } from "../store/worldStore.jsx";

function HomePage() {
  const { maps, markers, sites, createMap } = useWorld();
  const [mapName, setMapName] = useState("");
  const [imageFilename, setImageFilename] = useState("");
  const navigate = useNavigate();

  const mapsArray = Object.values(maps);
  const sitesArray = Object.values(sites);

  const handleCreateMap = async () => {
    const name = mapName.trim();
    const filename = imageFilename.trim();

    if (!name) {
      alert("Please enter a map name.");
      return;
    }
    if (!filename) {
      alert(
        'Please enter an image filename (e.g. "Worldmap.png") that you have placed into public/Img.'
      );
      return;
    }

    try {
      const newMap = await createMap({
        name,
        imageFilename: filename,
      });

      setMapName("");
      setImageFilename("");
      navigate(`/map/${newMap.id}`);
    } catch (err) {
      console.error("Failed to create map:", err);
      alert("Could not create map. Check console for details.");
    }
  };

  return (
    <div className="page">
      <h2>Dashboard</h2>

      <section style={{ marginBottom: "2rem" }}>
        <h3>Create New Map</h3>
        <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>
          Put your map images into <code>public/Img</code>, then reference them
          here by filename (e.g. <code>Worldmap.png</code>).
        </p>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Map name:
            <input
              type="text"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              placeholder="Overworld, City, Dungeon…"
              style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Image filename:
            <input
              type="text"
              value={imageFilename}
              onChange={(e) => setImageFilename(e.target.value)}
              placeholder="Worldmap.png"
              style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            />
          </label>
        </div>

        <button onClick={handleCreateMap}>Create Map</button>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h3>Maps</h3>
        {mapsArray.length === 0 && <p>No maps yet. Create one above.</p>}
        {mapsArray.length > 0 && (
          <ul>
            {mapsArray.map((map) => (
              <li key={map.id}>
                <Link to={`/map/${map.id}`}>{map.name}</Link>{" "}
                <span style={{ opacity: 0.6 }}>
                  (<code>{map.imageFilename}</code>)
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Sites</h3>
        {sitesArray.length === 0 && (
          <p>No sites yet. Create some via the map or Sites page.</p>
        )}
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
      </section>
    </div>
  );
}

export default HomePage;