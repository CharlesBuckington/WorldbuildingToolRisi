import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CreateEntryPanel from "../components/CreateEntryPanel.jsx";
import { useWiki } from "../store/wikiStore.jsx";
import { useAuth } from "../store/authStore.jsx";

function EntryListPage() {
  const { entries } = useWiki();
  const { activeCampaignId } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedTags, setSelectedTags] = useState([]);

  const allEntries = useMemo(() => {
    return Object.values(entries).sort((a, b) => {
      const aTitle = (a.title || "").toLowerCase();
      const bTitle = (b.title || "").toLowerCase();
      return aTitle.localeCompare(bTitle);
    });
  }, [entries]);

  const availableTypes = useMemo(() => {
    const types = new Set(
      allEntries
        .map((entry) => entry.type)
        .filter(Boolean)
    );

    return ["all", ...Array.from(types).sort((a, b) => a.localeCompare(b))];
  }, [allEntries]);

  const availableTags = useMemo(() => {
    const tags = new Set();

    allEntries.forEach((entry) => {
      const entryTags = Array.isArray(entry.tags) ? entry.tags : [];
      entryTags.forEach((tag) => {
        if (tag) {
          tags.add(String(tag).toLowerCase());
        }
      });
    });

    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allEntries.filter((entry) => {
      const titleMatch = (entry.title || "").toLowerCase().includes(normalizedSearch);
      const typeMatch = (entry.type || "").toLowerCase().includes(normalizedSearch);
      const tags = Array.isArray(entry.tags) ? entry.tags : [];
      const tagSearchMatch = tags.some((tag) =>
        String(tag).toLowerCase().includes(normalizedSearch)
      );

      const matchesSearch =
        !normalizedSearch || titleMatch || typeMatch || tagSearchMatch;

      const matchesType =
        selectedType === "all" || entry.type === selectedType;

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((selectedTag) =>
          tags.map((tag) => String(tag).toLowerCase()).includes(selectedTag)
        );

      return matchesSearch && matchesType && matchesTags;
    });
  }, [allEntries, search, selectedType, selectedTags]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((item) => item !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedType("all");
    setSelectedTags([]);
  };

  const hasActiveFilters =
    search.trim() !== "" || selectedType !== "all" || selectedTags.length > 0;

  if (!activeCampaignId) {
    return (
      <div className="page">
        <h2 className="page-title">All Entries</h2>
        <p>Select a campaign from the homepage before browsing entries.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h2 className="page-title">All Entries</h2>

      <CreateEntryPanel />

      <section className="content-block entry-filter-panel">
        <div className="page-toolbar">
          <label className="field-label">Search</label>
          <input
            className="fantasy-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, type, or tag..."
          />
        </div>

        <div className="entry-filter-group">
          <label className="field-label">Type</label>
          <div className="entry-filter-chips">
            {availableTypes.map((type) => {
              const isActive = selectedType === type;

              return (
                <button
                  key={type}
                  className={`entry-filter-chip ${isActive ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setSelectedType(type)}
                >
                  {type === "all" ? "All" : type}
                </button>
              );
            })}
          </div>
        </div>

        <div className="entry-filter-group">
          <label className="field-label">Tags</label>
          {availableTags.length === 0 ? (
            <p className="block-placeholder">No tags available yet.</p>
          ) : (
            <div className="entry-filter-chips">
              {availableTags.map((tag) => {
                const isActive = selectedTags.includes(tag);

                return (
                  <button
                    key={tag}
                    className={`entry-filter-chip ${isActive ? "is-active" : ""}`}
                    type="button"
                    onClick={() => toggleTag(tag)}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="entry-filter-footer">
          <div className="entry-filter-summary">
            {hasActiveFilters ? (
              <>
                <span>{filteredEntries.length} matching entries</span>
                {selectedType !== "all" && (
                  <span className="entry-tag">Type: {selectedType}</span>
                )}
                {selectedTags.map((tag) => (
                  <span key={tag} className="entry-tag">
                    #{tag}
                  </span>
                ))}
              </>
            ) : (
              <span>{filteredEntries.length} entries</span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              className="fantasy-button secondary"
              type="button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      </section>

      {filteredEntries.length === 0 && <p>No matching entries found.</p>}

      {filteredEntries.length > 0 && (
        <ul className="entry-list">
          {filteredEntries.map((entry) => (
            <li key={entry.id} className="entry-list-item">
              <div className="entry-list-item__main">
                <Link to={`/entry/${entry.id}`} className="entry-link">
                  {entry.title}
                </Link>
                <span className="entry-type-label">({entry.type})</span>
              </div>

              {(entry.tags ?? []).length > 0 && (
                <div className="entry-tags entry-tags--list">
                  {(entry.tags ?? []).map((tag) => (
                    <span key={tag} className="entry-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default EntryListPage;
