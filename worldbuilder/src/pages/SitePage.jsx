// src/pages/SitePage.jsx
import { useParams, Link, useNavigate } from "react-router-dom";
import { useWorld } from "../store/worldStore.jsx";

function SitePage() {
  const { siteId } = useParams();
  const { sites, updateSite } = useWorld();
  const navigate = useNavigate();

  const site = sites[siteId];

  if (!site) {
    return (
      <div className="page">
        <p>Site not found (maybe still loading or deleted).</p>
        <button onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  const allSites = Object.values(sites).filter((s) => s.id !== siteId);

  const handleFieldChange = (field, value) => {
    updateSite(siteId, { [field]: value });
  };

  const toggleLinkedSite = (targetId) => {
    const isLinked = site.linkedSiteIds.includes(targetId);
    const next = isLinked
      ? site.linkedSiteIds.filter((id) => id !== targetId)
      : [...site.linkedSiteIds, targetId];
    updateSite(siteId, { linkedSiteIds: next });
  };

  const backlinks = allSites.filter((s) => s.linkedSiteIds.includes(siteId));

  return (
    <div className="page">
      <h2>Site</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Title:
          <input
            type="text"
            value={site.title}
            onChange={(e) => handleFieldChange("title", e.target.value)}
            style={{ width: "100%", marginTop: "0.25rem" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Type:
          <select
            value={site.type}
            onChange={(e) => handleFieldChange("type", e.target.value)}
            style={{ width: "100%", marginTop: "0.25rem" }}
          >
            <option value="location">Location</option>
            <option value="npc">NPC</option>
            <option value="faction">Faction</option>
            <option value="note">Note</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Content:
          <textarea
            value={site.content}
            onChange={(e) => handleFieldChange("content", e.target.value)}
            rows={12}
            style={{ width: "100%", marginTop: "0.25rem" }}
            placeholder="Write lore, descriptions, NPCs, hooks…"
          />
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <h3>Links from this site</h3>
        <div
          style={{
            maxHeight: "200px",
            overflow: "auto",
            border: "1px solid #374151",
            padding: "0.5rem",
            borderRadius: "4px",
          }}
        >
          {allSites.length === 0 && <p>No other sites yet.</p>}
          {allSites.map((other) => {
            const isLinked = site.linkedSiteIds.includes(other.id);
            return (
              <div
                key={other.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "0.25rem",
                }}
              >
                <label style={{ flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={isLinked}
                    onChange={() => toggleLinkedSite(other.id)}
                    style={{ marginRight: "0.5rem" }}
                  />
                  {other.title}{" "}
                  <span style={{ opacity: 0.6 }}>({other.type})</span>
                </label>
                <button
                  type="button"
                  style={{ marginLeft: "0.5rem", fontSize: "0.75rem" }}
                  onClick={() =>
                    handleFieldChange(
                      "content",
                      site.content +
                        (site.content ? "\n" : "") +
                        `[${other.title}]`
                    )
                  }
                >
                  insert title
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <h3>Backlinks (linked from)</h3>
        {backlinks.length === 0 && <p>No backlinks yet.</p>}
        {backlinks.length > 0 && (
          <ul>
            {backlinks.map((other) => (
              <li key={other.id}>
                <Link to={`/site/${other.id}`}>{other.title}</Link>{" "}
                <span style={{ opacity: 0.6 }}>({other.type})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SitePage;