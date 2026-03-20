import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWiki } from "../store/wikiStore.jsx";
import { useAuth } from "../store/authStore.jsx";

function HomePage() {
  const { entries, createEntry } = useWiki();
  const {
    user,
    userProfile,
    activeCampaignId,
    activeCampaign,
    isAdmin,
    setPlayerCharacterEntry,
    unpinEntry,
    updateCampaign,
  } = useAuth();

  const [title, setTitle] = useState("");
  const [type, setType] = useState("location");
  const [isCharacterPickerOpen, setIsCharacterPickerOpen] = useState(false);
  const [characterSearch, setCharacterSearch] = useState("");
  const navigate = useNavigate();
  const [campaignNameInput, setCampaignNameInput] = useState("");
  const [sessionDateInput, setSessionDateInput] = useState("");
  const [sharedLinksInput, setSharedLinksInput] = useState("");

  const entriesArray = useMemo(() => {
    return Object.values(entries).sort((a, b) => {
      const aTime = a.updatedAt?.seconds ?? 0;
      const bTime = b.updatedAt?.seconds ?? 0;
      return bTime - aTime;
    });
  }, [entries]);

  const pinnedEntries = useMemo(() => {
    const pinnedIds = userProfile?.pinnedEntryIds ?? [];
    return pinnedIds.map((entryId) => entries[entryId]).filter(Boolean);
  }, [entries, userProfile]);

  const personalNotesEntryId =
    userProfile?.personalNotesEntryIds?.[activeCampaignId] ?? null;

  const characterEntryId =
    userProfile?.playerCharacterEntryIds?.[activeCampaignId] ?? null;

  const characterSearchResults = useMemo(() => {
    const normalized = characterSearch.trim().toLowerCase();

    if (!normalized) {
      return entriesArray
        .filter((entry) => entry.id !== personalNotesEntryId)
        .slice(0, 8);
    }

    return entriesArray
      .filter((entry) => {
        if (entry.id === personalNotesEntryId) return false;

        const titleMatch = (entry.title || "").toLowerCase().includes(normalized);
        const typeMatch = (entry.type || "").toLowerCase().includes(normalized);
        const tags = Array.isArray(entry.tags) ? entry.tags : [];
        const tagMatch = tags.some((tag) =>
          String(tag).toLowerCase().includes(normalized)
        );

        return titleMatch || typeMatch || tagMatch;
      })
      .slice(0, 8);
  }, [entriesArray, characterSearch, personalNotesEntryId]);

  const lastEditedByYou = useMemo(() => {
    return entriesArray
      .filter((entry) => entry.updatedBy === user?.uid)
      .slice(0, 5);
  }, [entriesArray, user]);

  const recentEntries = useMemo(() => {
    return entriesArray.slice(0, 6);
  }, [entriesArray]);

  const sessionInfo = useMemo(() => {
    if (!activeCampaign?.sessionDate) {
      return {
        label: "No session scheduled",
        detail: "Add a session date to your campaign data.",
      };
    }

    const targetDate = new Date(activeCampaign.sessionDate);
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();

    if (Number.isNaN(targetDate.getTime())) {
      return {
        label: "Invalid session date",
        detail: "Please update the campaign session date.",
      };
    }

    if (diffMs <= 0) {
      return {
        label: "Session day is here",
        detail: targetDate.toLocaleString(),
      };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    return {
      label: `${days}d ${hours}h until next session`,
      detail: targetDate.toLocaleString(),
    };
  }, [activeCampaign]);

  const sharedLinks = activeCampaign?.sharedLinks ?? [];

  useEffect(() => {
    setCampaignNameInput(activeCampaign?.name ?? "");
    setSessionDateInput(activeCampaign?.sessionDate ?? "");
    setSharedLinksInput(
      (activeCampaign?.sharedLinks ?? [])
        .map((link) => `${link.label}|${link.url}`)
        .join("\n")
    );
  }, [activeCampaign]);

  const handleCreateEntry = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const entry = await createEntry({
      title: trimmed,
      type,
      tags: [type],
    });

    setTitle("");
    navigate(`/entry/${entry.id}`);
  };

  const handleSelectCharacterEntry = async (entryId) => {
    await setPlayerCharacterEntry(activeCampaignId, entryId);
    setCharacterSearch("");
    setIsCharacterPickerOpen(false);
  };

  const handleSaveCampaignSettings = async () => {
    const parsedLinks = sharedLinksInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, ...urlParts] = line.split("|");
        return {
          label: (label ?? "").trim(),
          url: urlParts.join("|").trim(),
        };
      })
      .filter((link) => link.label && link.url);

    await updateCampaign(activeCampaignId, {
      name: campaignNameInput.trim() || "Unnamed Campaign",
      sessionDate: sessionDateInput.trim() || null,
      sharedLinks: parsedLinks,
    });
  };
  
  return (
    <div className="page home-dashboard">
      <section className="home-hero content-block">
        <div>
          <p className="home-eyebrow">Active Campaign</p>
          <h2 className="home-hero__title">
            {activeCampaign?.name || "Unknown Campaign"}
          </h2>
          <p className="home-hero__text">
            A shared campaign hub for characters, places, quests, lore, and
            private notes.
          </p>
        </div>

        <div className="home-session">
          <div className="home-session__label">{sessionInfo.label}</div>
          <div className="home-session__detail">{sessionInfo.detail}</div>
        </div>
      </section>

      <div className="home-grid home-grid--top">
        <section className="content-block home-card">
          <p className="home-card__eyebrow">Your Profile</p>
          <div className="home-profile">
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName || "Profile"}
                className="home-profile__image"
              />
            ) : (
              <div className="home-profile__image home-profile__image--placeholder">
                {(userProfile?.displayName || "A").slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="home-profile__body">
              <h3 className="home-card__title">
                {userProfile?.displayName || "Adventurer"}
              </h3>
              <p className="home-card__text">Campaign ID: {activeCampaignId}</p>

              <div className="block-actions">
                {characterEntryId ? (
                  <Link
                    className="fantasy-button secondary"
                    to={`/entry/${characterEntryId}`}
                  >
                    My Character
                  </Link>
                ) : (
                  <button
                    className="fantasy-button secondary"
                    type="button"
                    onClick={() => setIsCharacterPickerOpen((prev) => !prev)}
                  >
                    Set My Character
                  </button>
                )}

                {characterEntryId && (
                  <button
                    className="fantasy-button secondary"
                    type="button"
                    onClick={() => setIsCharacterPickerOpen((prev) => !prev)}
                  >
                    Change My Character
                  </button>
                )}

                {personalNotesEntryId && (
                  <Link
                    className="fantasy-button secondary"
                    to={`/entry/${personalNotesEntryId}`}
                  >
                    Personal Notes
                  </Link>
                )}

                <Link className="fantasy-button secondary" to="/party">
                  My Party
                </Link>
              </div>

              {isCharacterPickerOpen && (
                <div className="home-character-picker">
                  <label className="field-label">Select character entry</label>
                  <input
                    className="fantasy-input"
                    type="text"
                    value={characterSearch}
                    onChange={(e) => setCharacterSearch(e.target.value)}
                    placeholder="Search entries by title, type, or tag..."
                  />

                  <div className="home-character-picker__results">
                    {characterSearchResults.length === 0 ? (
                      <p className="block-placeholder">No matching entries found.</p>
                    ) : (
                      <ul className="entry-list">
                        {characterSearchResults.map((entry) => (
                          <li key={entry.id} className="entry-list-item">
                            <button
                              className="home-character-picker__result-button"
                              type="button"
                              onClick={() => handleSelectCharacterEntry(entry.id)}
                            >
                              <span className="entry-link">{entry.title}</span>
                              <span className="entry-type-label">({entry.type})</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="content-block home-card">
          <p className="home-card__eyebrow">Create Entry</p>
          <h3 className="home-card__title">Add something new</h3>
          <p className="home-card__text">
            Create a new location, NPC, faction, quest, or note.
          </p>

          <div className="block-edit-fields">
            <label className="field-label">Title</label>
            <input
              className="fantasy-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Neverwinter, Goblin Camp, Lord Harbin..."
            />

            <label className="field-label">Type</label>
            <select
              className="fantasy-input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="location">Location</option>
              <option value="npc">NPC</option>
              <option value="faction">Faction</option>
              <option value="quest">Quest</option>
              <option value="note">Note</option>
            </select>
          </div>

          <div className="block-actions">
            <button className="fantasy-button" type="button" onClick={handleCreateEntry}>
              Create Entry
            </button>
          </div>
        </section>
      </div>

      {isAdmin && (
        <section className="content-block home-card">
          <p className="home-card__eyebrow">Admin</p>
          <h3 className="home-card__title">Campaign Settings</h3>
          <p className="home-card__text">
            Manage the active campaign name, next session date, and shared links.
          </p>

          <div className="block-edit-fields">
            <label className="field-label">Campaign Name</label>
            <input
              className="fantasy-input"
              type="text"
              value={campaignNameInput}
              onChange={(e) => setCampaignNameInput(e.target.value)}
              placeholder="Zerinthra"
            />

            <label className="field-label">Next Session Date</label>
            <input
              className="fantasy-input"
              type="datetime-local"
              value={sessionDateInput}
              onChange={(e) => setSessionDateInput(e.target.value)}
            />

            <label className="field-label">Shared Links</label>
            <textarea
              className="fantasy-input home-admin-links-input"
              value={sharedLinksInput}
              onChange={(e) => setSharedLinksInput(e.target.value)}
              placeholder={`DnDBeyond Campaign|https://...\nCharacter Sheets|https://...`}
            />
          </div>

          <p className="home-card__text">
            Enter one link per line in the format: <strong>Label|URL</strong>
          </p>

          <div className="block-actions">
            <button
              className="fantasy-button"
              type="button"
              onClick={handleSaveCampaignSettings}
            >
              Save Campaign Settings
            </button>
          </div>
        </section>
      )}

      <div className="home-grid home-grid--middle">
        <section className="content-block home-card">
          <p className="home-card__eyebrow">Quick Access</p>
          <h3 className="home-card__title">Pinned entries</h3>

          {pinnedEntries.length === 0 ? (
            <p className="home-card__text">
              No pinned entries yet. Later you can pin important locations,
              quests, NPCs, and notes here.
            </p>
          ) : (
            <ul className="entry-list">
              {pinnedEntries.map((entry) => (
                <li key={entry.id} className="entry-list-item home-pinned-item">
                  <div className="home-pinned-item__main">
                    <Link to={`/entry/${entry.id}`} className="entry-link">
                      {entry.title}
                    </Link>
                    <span className="entry-type-label">({entry.type})</span>
                  </div>

                  <button
                    className="fantasy-button secondary home-pinned-item__button"
                    type="button"
                    onClick={() => unpinEntry(entry.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="content-block home-card">
          <p className="home-card__eyebrow">Your Activity</p>
          <h3 className="home-card__title">Last edited by you</h3>

          {lastEditedByYou.length === 0 ? (
            <p className="home-card__text">You have not edited any entries yet.</p>
          ) : (
            <ul className="entry-list">
              {lastEditedByYou.map((entry) => (
                <li key={entry.id} className="entry-list-item">
                  <Link to={`/entry/${entry.id}`} className="entry-link">
                    {entry.title}
                  </Link>
                  <span className="entry-type-label">({entry.type})</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="content-block home-card">
        <p className="home-card__eyebrow">Campaign Activity</p>
        <h3 className="home-card__title">Recent entries</h3>

        {recentEntries.length === 0 ? (
          <p className="home-card__text">No entries yet.</p>
        ) : (
          <ul className="entry-list">
            {recentEntries.map((entry) => (
              <li key={entry.id} className="entry-list-item">
                <Link to={`/entry/${entry.id}`} className="entry-link">
                  {entry.title}
                </Link>
                <span className="entry-type-label">({entry.type})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="home-footer content-block">
        <div>
          <p className="home-card__eyebrow">Shared Links</p>
          <h3 className="home-card__title">Campaign Resources</h3>
        </div>

        <div className="home-footer__links">
          {sharedLinks.length === 0 ? (
            <p className="home-card__text">No shared links yet.</p>
          ) : (
            sharedLinks.map((link) => (
              <a
                key={link.label}
                className="home-footer__link"
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            ))
          )}
        </div>
      </footer>
    </div>
  );
}

export default HomePage;