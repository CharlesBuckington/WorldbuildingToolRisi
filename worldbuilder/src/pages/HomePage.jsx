// src/pages/HomePage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWiki } from "../store/wikiStore.jsx";

function HomePage() {
  const { entries, createEntry } = useWiki();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("location");
  const navigate = useNavigate();

  const entriesArray = Object.values(entries);

  const handleCreateEntry = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const entry = await createEntry({
      title: trimmed,
      type,
    });

    setTitle("");
    navigate(`/entry/${entry.id}`);
  };

  return (
    <div className="page">
      <h2>Dashboard</h2>

      <section style={{ marginBottom: "2rem" }}>
        <h3>Create Entry</h3>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Neverwinter, Goblin Camp, Lord Harbin..."
          style={{ display: "block", width: "100%", marginBottom: "0.5rem" }}
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: "0.5rem" }}
        >
          <option value="location">Location</option>
          <option value="npc">NPC</option>
          <option value="faction">Faction</option>
          <option value="quest">Quest</option>
          <option value="note">Note</option>
        </select>

        <button onClick={handleCreateEntry}>Create Entry</button>
      </section>

      <section>
        <h3>Recent Entries</h3>
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
      </section>
    </div>
  );
}

export default HomePage;