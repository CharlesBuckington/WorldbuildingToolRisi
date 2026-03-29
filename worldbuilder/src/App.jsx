// src/App.jsx
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { useMemo, useRef, useState, useEffect } from "react";
import HomePage from "./pages/HomePage.jsx";
import EntryPage from "./pages/EntryPage.jsx";
import EntryListPage from "./pages/EntryListPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MyPartyPage from "./pages/MyPartyPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import { useAuth } from "./store/authStore.jsx";

const THEME_STORAGE_KEY = "worldbuilder-theme";

function App() {
  const { user, userProfile, authLoading, logout, activeCampaignId, activeCampaign } = useAuth();
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  };

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
            <button
              className="topbar-link topbar-link--button theme-toggle"
              type="button"
              onClick={toggleTheme}
            >
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </button>

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

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "dark" ? "dark" : "light";
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

export default App;
