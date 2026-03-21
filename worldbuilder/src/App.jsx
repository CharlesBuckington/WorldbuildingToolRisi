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
  const { user, userProfile, authLoading, logout, activeCampaignId } = useAuth();

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

function ProfileMenu({ userProfile, activeCampaignId, onLogout }) {
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
              Campaign: {activeCampaignId || "zerinthra"}
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
  const [search, setSearch] = useState("");
  const entriesArray = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    const allEntries = Object.values(entries).sort((a, b) => {
      const aTitle = (a.title || "").toLowerCase();
      const bTitle = (b.title || "").toLowerCase();
      return aTitle.localeCompare(bTitle);
    });

    if (!normalized) {
      return allEntries;
    }

    return allEntries.filter((entry) => {
      const titleMatch = (entry.title || "").toLowerCase().includes(normalized);
      const typeMatch = (entry.type || "").toLowerCase().includes(normalized);
      const tags = Array.isArray(entry.tags) ? entry.tags : [];
      const tagMatch = tags.some((tag) =>
        String(tag).toLowerCase().includes(normalized)
      );

      return titleMatch || typeMatch || tagMatch;
    });
  }, [entries, search]);

  return (
    <div className="page">
      <h2 className="page-title">All Entries</h2>

      <div className="page-toolbar">
        <label className="field-label">Search entries</label>
        <input
          className="fantasy-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, type, or tag..."
        />
      </div>

      {entriesArray.length === 0 && <p>No matching entries found.</p>}

      {entriesArray.length > 0 && (
        <ul className="entry-list">
          {entriesArray.map((entry) => (
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
      .filter((profile) => {
        const campaignIds = profile.campaignIds ?? [];
        return campaignIds.includes(activeCampaignId);
      })
      .map((profile) => {
        const characterEntryId =
          profile.playerCharacterEntryIds?.[activeCampaignId] ?? null;

        const characterEntry = characterEntryId ? entries[characterEntryId] : null;

        return {
          uid: profile.uid,
          displayName: profile.displayName || "Adventurer",
          photoURL: profile.photoURL || "",
          characterEntryId,
          characterEntry,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUserProfiles, activeCampaignId, entries]);

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