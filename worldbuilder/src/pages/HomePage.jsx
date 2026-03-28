import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWiki } from "../store/wikiStore.jsx";
import { useAuth } from "../store/authStore.jsx";

function HomePage() {
  const { entries, createEntry } = useWiki();
  const {
    user,
    userProfile,
    visibleCampaigns,
    campaignMemberships,
    campaignMembers,
    activeCampaignId,
    activeCampaign,
    isAdmin,
    canWriteActiveCampaign,
    setActiveCampaign,
    createCampaign,
    joinCampaign,
    setPlayerCharacterEntry,
    unpinEntry,
    updateCampaign,
    updateCampaignMember,
  } = useAuth();

  const [title, setTitle] = useState("");
  const [type, setType] = useState("location");
  const [isCharacterPickerOpen, setIsCharacterPickerOpen] = useState(false);
  const [characterSearch, setCharacterSearch] = useState("");
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isJoinCampaignOpen, setIsJoinCampaignOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignPassword, setNewCampaignPassword] = useState("");
  const [joinCampaignIdInput, setJoinCampaignIdInput] = useState("");
  const [joinCampaignPasswordInput, setJoinCampaignPasswordInput] = useState("");
  const [campaignActionState, setCampaignActionState] = useState("idle");
  const [campaignActionMessage, setCampaignActionMessage] = useState("");
  const [campaignActionError, setCampaignActionError] = useState("");
  const [campaignNameInput, setCampaignNameInput] = useState("");
  const [sessionDateInput, setSessionDateInput] = useState("");
  const [sharedLinksInput, setSharedLinksInput] = useState("");
  const [joinPasswordInput, setJoinPasswordInput] = useState("");
  const [settingsState, setSettingsState] = useState("idle");
  const [settingsError, setSettingsError] = useState("");
  const [updatingMemberUid, setUpdatingMemberUid] = useState("");
  const navigate = useNavigate();

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
        detail: "Add a session date to your campaign settings.",
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
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return {
      label: `${days}d ${hours}h until next session`,
      detail: targetDate.toLocaleString(),
    };
  }, [activeCampaign]);

  const sharedLinks = activeCampaign?.sharedLinks ?? [];

  const activeCampaignMembers = useMemo(() => {
    return Object.values(campaignMembers).sort((a, b) => {
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      return (a.displayName || "").localeCompare(b.displayName || "");
    });
  }, [campaignMembers]);

  useEffect(() => {
    setCampaignNameInput(activeCampaign?.name ?? "");
    setSessionDateInput(activeCampaign?.sessionDate ?? "");
    setSharedLinksInput(
      (activeCampaign?.sharedLinks ?? [])
        .map((link) => `${link.label}|${link.url}`)
        .join("\n")
    );
    setJoinPasswordInput("");
    setSettingsState("idle");
    setSettingsError("");
  }, [activeCampaign]);

  const handleCreateEntry = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const entry = await createEntry({
      title: trimmedTitle,
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

  const handleCreateCampaign = async () => {
    setCampaignActionState("saving");
    setCampaignActionError("");
    setCampaignActionMessage("");

    try {
      await createCampaign({
        name: newCampaignName,
        joinPassword: newCampaignPassword,
      });

      setCampaignActionState("saved");
      setCampaignActionMessage("Campaign created.");
      setNewCampaignName("");
      setNewCampaignPassword("");
      setIsCreateCampaignOpen(false);
    } catch (error) {
      console.error(error);
      setCampaignActionState("error");
      setCampaignActionError(getCampaignActionErrorMessage(error));
    }
  };

  const handleJoinCampaign = async () => {
    setCampaignActionState("saving");
    setCampaignActionError("");
    setCampaignActionMessage("");

    try {
      await joinCampaign({
        campaignId: joinCampaignIdInput,
        joinPassword: joinCampaignPasswordInput,
      });

      setCampaignActionState("saved");
      setCampaignActionMessage("Campaign joined.");
      setJoinCampaignIdInput("");
      setJoinCampaignPasswordInput("");
      setIsJoinCampaignOpen(false);
    } catch (error) {
      console.error(error);
      setCampaignActionState("error");
      setCampaignActionError(getCampaignActionErrorMessage(error));
    }
  };

  const handleSaveCampaignSettings = async () => {
    if (!activeCampaignId) return;

    setSettingsState("saving");
    setSettingsError("");

    try {
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
        joinPassword: joinPasswordInput,
      });

      setJoinPasswordInput("");
      setSettingsState("saved");
    } catch (error) {
      console.error(error);
      setSettingsState("error");
      setSettingsError(getCampaignActionErrorMessage(error));
    }
  };

  const handleToggleWriteAccess = async (member) => {
    if (!activeCampaignId || member.isOwner) {
      return;
    }

    setUpdatingMemberUid(member.userUid);

    try {
      await updateCampaignMember(activeCampaignId, member.userUid, {
        canWrite: !member.canWrite,
      });
    } catch (error) {
      console.error("Failed to update player permissions:", error);
    } finally {
      setUpdatingMemberUid("");
    }
  };

  return (
    <div className="page home-dashboard">
      <section className="content-block home-card campaign-hub">
        <div className="campaign-hub__header">
          <div>
            <p className="home-card__eyebrow">Campaign Hub</p>
            <h2 className="page-title">Your Campaigns</h2>
            <p className="home-card__text">
              Create a campaign, join one with an ID and password, then choose which campaign you want to open.
            </p>
          </div>

          {activeCampaignId && (
            <button
              className="fantasy-button secondary"
              type="button"
              onClick={() => setActiveCampaign(null)}
            >
              Hide Campaign Overview
            </button>
          )}
        </div>

        <div className="campaign-hub__actions">
          <button
            className="fantasy-button"
            type="button"
            onClick={() => {
              setIsCreateCampaignOpen((current) => !current);
              setIsJoinCampaignOpen(false);
              setCampaignActionError("");
              setCampaignActionMessage("");
            }}
          >
            Create Own Campaign
          </button>

          <button
            className="fantasy-button secondary"
            type="button"
            onClick={() => {
              setIsJoinCampaignOpen((current) => !current);
              setIsCreateCampaignOpen(false);
              setCampaignActionError("");
              setCampaignActionMessage("");
            }}
          >
            Join Campaign by ID and Password
          </button>
        </div>

        {isCreateCampaignOpen && (
          <div className="campaign-hub__panel">
            <div className="block-edit-fields">
              <label className="field-label">Campaign Name</label>
              <input
                className="fantasy-input"
                type="text"
                value={newCampaignName}
                onChange={(event) => setNewCampaignName(event.target.value)}
                placeholder="The Ember Coast"
              />

              <label className="field-label">Join Password</label>
              <input
                className="fantasy-input"
                type="password"
                value={newCampaignPassword}
                onChange={(event) => setNewCampaignPassword(event.target.value)}
                placeholder="At least 6 characters"
              />
            </div>

            <div className="block-actions">
              <button
                className="fantasy-button"
                type="button"
                onClick={handleCreateCampaign}
                disabled={campaignActionState === "saving"}
              >
                {campaignActionState === "saving" ? "Creating..." : "Create Campaign"}
              </button>
            </div>
          </div>
        )}

        {isJoinCampaignOpen && (
          <div className="campaign-hub__panel">
            <div className="block-edit-fields">
              <label className="field-label">Campaign ID</label>
              <input
                className="fantasy-input"
                type="text"
                value={joinCampaignIdInput}
                onChange={(event) => setJoinCampaignIdInput(event.target.value)}
                placeholder="Paste the campaign ID"
              />

              <label className="field-label">Campaign Password</label>
              <input
                className="fantasy-input"
                type="password"
                value={joinCampaignPasswordInput}
                onChange={(event) => setJoinCampaignPasswordInput(event.target.value)}
                placeholder="Enter the shared campaign password"
              />
            </div>

            <div className="block-actions">
              <button
                className="fantasy-button"
                type="button"
                onClick={handleJoinCampaign}
                disabled={campaignActionState === "saving"}
              >
                {campaignActionState === "saving" ? "Joining..." : "Join Campaign"}
              </button>
            </div>
          </div>
        )}

        {campaignActionMessage && (
          <p className="profile-save-message">{campaignActionMessage}</p>
        )}

        {campaignActionError && (
          <p className="profile-save-message profile-save-message--error">
            {campaignActionError}
          </p>
        )}

        {visibleCampaigns.length === 0 ? (
          <p className="home-card__text">
            You are not part of any campaigns yet. Create one or join one to get started.
          </p>
        ) : (
          <div className="campaign-list">
            {visibleCampaigns.map((campaign) => {
              const membership = campaignMemberships[campaign.id];
              const isSelected = campaign.id === activeCampaignId;

              return (
                <button
                  key={campaign.id}
                  type="button"
                  className={`campaign-card ${isSelected ? "is-selected" : ""}`}
                  onClick={() => setActiveCampaign(campaign.id)}
                >
                  <div className="campaign-card__header">
                    <div>
                      <div className="campaign-card__title">{campaign.name}</div>
                      <div className="campaign-card__subtitle">ID: {campaign.id}</div>
                    </div>

                    <span className="entry-tag">
                      {getCampaignPermissionLabel(campaign, membership, user?.uid)}
                    </span>
                  </div>

                  <div className="campaign-card__footer">
                    {campaign.id === activeCampaignId ? "Selected" : "Open Campaign"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {!activeCampaign && (
        <section className="content-block home-card">
          <p className="home-card__eyebrow">Overview</p>
          <h3 className="home-card__title">Select a campaign to continue</h3>
          <p className="home-card__text">
            Once a campaign is selected, this page will show its session info, quick links, recent activity, and management tools.
          </p>
        </section>
      )}

      {activeCampaign && (
        <>
          <section className="home-hero content-block">
            <div>
              <p className="home-eyebrow">Selected Campaign</p>
              <h2 className="home-hero__title">
                {activeCampaign?.name || "Unknown Campaign"}
              </h2>
              <p className="home-hero__text">
                A shared campaign hub for characters, places, quests, lore, and private notes.
              </p>
              <p className="home-card__text">Campaign ID: {activeCampaignId}</p>
            </div>

            <div className="home-session">
              <div className="home-session__label">{sessionInfo.label}</div>
              <div className="home-session__detail">{sessionInfo.detail}</div>
              <div className="home-session__detail">
                {isAdmin ? "Owner Access" : canWriteActiveCampaign ? "Read / Write" : "Read Only"}
              </div>
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
                  <p className="home-card__text">
                    {isAdmin
                      ? "You own this campaign."
                      : canWriteActiveCampaign
                      ? "You can read and edit this campaign."
                      : "You currently have read-only access to this campaign."}
                  </p>

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
                        onClick={() => setIsCharacterPickerOpen((current) => !current)}
                      >
                        Set My Character
                      </button>
                    )}

                    {characterEntryId && (
                      <button
                        className="fantasy-button secondary"
                        type="button"
                        onClick={() => setIsCharacterPickerOpen((current) => !current)}
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
                        onChange={(event) => setCharacterSearch(event.target.value)}
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
                {canWriteActiveCampaign
                  ? "Create a new location, NPC, faction, quest, or note."
                  : "You currently have read-only access, so campaign entries cannot be created from this account."}
              </p>

              <div className="block-edit-fields">
                <label className="field-label">Title</label>
                <input
                  className="fantasy-input"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Neverwinter, Goblin Camp, Lord Harbin..."
                  disabled={!canWriteActiveCampaign}
                />

                <label className="field-label">Type</label>
                <select
                  className="fantasy-input"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  disabled={!canWriteActiveCampaign}
                >
                  <option value="location">Location</option>
                  <option value="npc">NPC</option>
                  <option value="faction">Faction</option>
                  <option value="quest">Quest</option>
                  <option value="note">Note</option>
                </select>
              </div>

              <div className="block-actions">
                <button
                  className="fantasy-button"
                  type="button"
                  onClick={handleCreateEntry}
                  disabled={!canWriteActiveCampaign}
                >
                  Create Entry
                </button>
              </div>
            </section>
          </div>

          {isAdmin && (
            <div className="home-grid home-grid--top">
              <section className="content-block home-card">
                <p className="home-card__eyebrow">Owner</p>
                <h3 className="home-card__title">Campaign Settings</h3>
                <p className="home-card__text">
                  Update the campaign name, session date, shared links, and join password.
                </p>

                <div className="block-edit-fields">
                  <label className="field-label">Campaign Name</label>
                  <input
                    className="fantasy-input"
                    type="text"
                    value={campaignNameInput}
                    onChange={(event) => setCampaignNameInput(event.target.value)}
                    placeholder="Zerinthra"
                  />

                  <label className="field-label">Next Session Date</label>
                  <input
                    className="fantasy-input"
                    type="datetime-local"
                    value={sessionDateInput}
                    onChange={(event) => setSessionDateInput(event.target.value)}
                  />

                  <label className="field-label">Shared Links</label>
                  <textarea
                    className="fantasy-input home-admin-links-input"
                    value={sharedLinksInput}
                    onChange={(event) => setSharedLinksInput(event.target.value)}
                    placeholder={`DnDBeyond Campaign|https://...\nCharacter Sheets|https://...`}
                  />

                  <label className="field-label">New Join Password</label>
                  <input
                    className="fantasy-input"
                    type="password"
                    value={joinPasswordInput}
                    onChange={(event) => setJoinPasswordInput(event.target.value)}
                    placeholder="Leave blank to keep the current password"
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
                    disabled={settingsState === "saving"}
                  >
                    {settingsState === "saving" ? "Saving..." : "Save Campaign Settings"}
                  </button>
                </div>

                {settingsState === "saved" && (
                  <p className="profile-save-message">Campaign settings saved.</p>
                )}

                {settingsError && (
                  <p className="profile-save-message profile-save-message--error">
                    {settingsError}
                  </p>
                )}
              </section>

              <section className="content-block home-card">
                <p className="home-card__eyebrow">Owner</p>
                <h3 className="home-card__title">Player Management</h3>
                <p className="home-card__text">
                  Campaign members can always read. Toggle whether they can also edit campaign content.
                </p>

                <div className="player-management-list">
                  {activeCampaignMembers.map((member) => (
                    <div key={member.userUid} className="player-management-row">
                      <div className="player-management-row__identity">
                        {member.photoURL ? (
                          <img
                            src={member.photoURL}
                            alt={member.displayName || member.userUid}
                            className="party-card__avatar"
                          />
                        ) : (
                          <div className="party-card__avatar party-card__avatar--placeholder">
                            {(member.displayName || member.userUid).slice(0, 1).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <div className="player-management-row__name">
                            {member.displayName || "Adventurer"}
                          </div>
                          <div className="player-management-row__meta">
                            {member.isOwner
                              ? "Campaign owner"
                              : member.canWrite
                              ? "Read / write"
                              : "Read only"}
                          </div>
                        </div>
                      </div>

                      <button
                        className="fantasy-button secondary"
                        type="button"
                        onClick={() => handleToggleWriteAccess(member)}
                        disabled={member.isOwner || updatingMemberUid === member.userUid}
                      >
                        {member.isOwner
                          ? "Owner"
                          : updatingMemberUid === member.userUid
                          ? "Saving..."
                          : member.canWrite
                          ? "Set Read Only"
                          : "Grant Write Access"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          <div className="home-grid home-grid--middle">
            <section className="content-block home-card">
              <p className="home-card__eyebrow">Quick Access</p>
              <h3 className="home-card__title">Pinned entries</h3>

              {pinnedEntries.length === 0 ? (
                <p className="home-card__text">
                  No pinned entries yet. Later you can pin important locations, quests, NPCs, and notes here.
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
                <p className="home-card__text">You have not edited any entries in this campaign yet.</p>
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
        </>
      )}
    </div>
  );
}

function getCampaignPermissionLabel(campaign, membership, userUid) {
  if (!campaign || !membership) {
    return "Member";
  }

  if (campaign.ownerUid === userUid || membership.isOwner) {
    return "Owner";
  }

  if (membership.canWrite) {
    return "Read / Write";
  }

  return "Read Only";
}

function getCampaignActionErrorMessage(error) {
  const code = error?.code || "";

  if (code === "campaign/name-required") {
    return "Campaign name is required.";
  }

  if (code === "campaign/password-too-short") {
    return "Campaign passwords must be at least 6 characters long.";
  }

  if (code === "campaign/id-required") {
    return "Campaign ID is required.";
  }

  if (code === "campaign/password-required") {
    return "Campaign password is required.";
  }

  if (code === "campaign/not-found") {
    return "No campaign was found with that ID.";
  }

  if (code === "campaign/invalid-password") {
    return "The campaign password is incorrect.";
  }

  return error?.message || "Something went wrong. Please try again.";
}

export default HomePage;
