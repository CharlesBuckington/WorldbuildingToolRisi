// src/App.jsx
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { useMemo, useRef, useState, useEffect } from "react";
import HomePage from "./pages/HomePage.jsx";
import EntryPage from "./pages/EntryPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import { useWiki } from "./store/wikiStore.jsx";
import { useAuth } from "./store/authStore.jsx";

function App() {
  const { user, userProfile, authLoading, logout, activeCampaignId, activeCampaign } = useAuth();

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

                <ProfileMenu
                  userProfile={userProfile}
                  activeCampaignId={activeCampaignId}
                  activeCampaign={activeCampaign}
                  onLogout={logout}
                />
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

            <Route
              path="/party"
              element={
                <ProtectedRoute user={user}>
                  <MyPartyPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute user={user}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function ProfileMenu({ userProfile, activeCampaignId, activeCampaign, onLogout }) {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const personalNotesEntryId =
    userProfile?.personalNotesEntryIds?.[activeCampaignId] ?? null;

  const characterEntryId =
    userProfile?.playerCharacterEntryIds?.[activeCampaignId] ?? null;

  const initials = useMemo(() => {
    const name = userProfile?.displayName?.trim() || "Adventurer";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [userProfile]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNavigate = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        className="profile-menu__trigger"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {userProfile?.photoURL ? (
          <img
            className="profile-menu__avatar-image"
            src={userProfile.photoURL}
            alt={userProfile.displayName || "Profile"}
          />
        ) : (
          <span className="profile-menu__avatar-fallback">{initials}</span>
        )}
      </button>

      {isOpen && (
        <div className="profile-menu__dropdown">
          <div className="profile-menu__header">
            <div className="profile-menu__name">
              {userProfile?.displayName || "Adventurer"}
            </div>
            <div className="profile-menu__campaign">
              Campaign: {activeCampaign?.name || activeCampaignId || "No campaign selected"}
            </div>
          </div>

          <button
            className="profile-menu__item"
            type="button"
            onClick={() => handleNavigate("/")}
          >
            Dashboard
          </button>

          <button
            className="profile-menu__item"
            type="button"
            onClick={() => {
              if (characterEntryId) {
                handleNavigate(`/entry/${characterEntryId}`);
              }
            }}
            disabled={!characterEntryId}
          >
            My Character
          </button>

          <button
            className="profile-menu__item"
            type="button"
            onClick={() => {
              if (personalNotesEntryId) {
                handleNavigate(`/entry/${personalNotesEntryId}`);
              }
            }}
            disabled={!personalNotesEntryId}
          >
            Personal Notes
          </button>

          <button
            className="profile-menu__item"
            type="button"
            onClick={() => handleNavigate("/party")}
            disabled={!activeCampaignId}
          >
            My Party
          </button>

          <button
            className="profile-menu__item"
            type="button"
            onClick={() => handleNavigate("/profile")}
          >
            Account Settings
          </button>

          <div className="profile-menu__divider" />

          <button
            className="profile-menu__item profile-menu__item--danger"
            type="button"
            onClick={async () => {
              setIsOpen(false);
              await onLogout();
            }}
          >
            Logout
          </button>
        </div>
      )}
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

function MyPartyPage() {
  const { entries } = useWiki();
  const { allUserProfiles, activeCampaignId } = useAuth();

  const partyMembers = useMemo(() => {
    return Object.values(allUserProfiles)
      .map((profile) => {
        const characterEntryId = profile.playerCharacterEntryId ?? null;

        const characterEntry = characterEntryId ? entries[characterEntryId] : null;

        return {
          uid: profile.userUid,
          displayName: profile.displayName || "Adventurer",
          photoURL: profile.photoURL || "",
          characterEntryId,
          characterEntry,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUserProfiles, entries]);

  if (!activeCampaignId) {
    return (
      <div className="page">
        <h2 className="page-title">My Party</h2>
        <p>Select a campaign from the homepage before opening the party view.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h2 className="page-title">My Party</h2>

      <p className="home-card__text" style={{ marginBottom: "1rem" }}>
        All players currently linked to the active campaign.
      </p>

      {partyMembers.length === 0 && (
        <p>No party members found for this campaign yet.</p>
      )}

      {partyMembers.length > 0 && (
        <div className="party-grid">
          {partyMembers.map((member) => (
            <section key={member.uid} className="content-block party-card">
              <div className="party-card__header">
                {member.photoURL ? (
                  <img
                    src={member.photoURL}
                    alt={member.displayName}
                    className="party-card__avatar"
                  />
                ) : (
                  <div className="party-card__avatar party-card__avatar--placeholder">
                    {member.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="party-card__identity">
                  <h3 className="party-card__name">{member.displayName}</h3>
                  <p className="party-card__subtitle">Campaign member</p>
                </div>
              </div>

              <div className="party-card__body">
                {member.characterEntry ? (
                  <>
                    <p className="party-card__label">Player Character</p>
                    <Link
                      to={`/entry/${member.characterEntry.id}`}
                      className="entry-link"
                    >
                      {member.characterEntry.title}
                    </Link>
                    <span className="entry-type-label">
                      ({member.characterEntry.type})
                    </span>

                    <div className="block-actions">
                      <Link
                        className="fantasy-button secondary"
                        to={`/entry/${member.characterEntry.id}`}
                      >
                        Open Character
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="party-card__label">Player Character</p>
                    <p className="home-card__text">
                      No character linked yet.
                    </p>
                  </>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
