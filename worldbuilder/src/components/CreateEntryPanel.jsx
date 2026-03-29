import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWiki } from "../store/wikiStore.jsx";
import { useAuth } from "../store/authStore.jsx";

function CreateEntryPanel() {
  const navigate = useNavigate();
  const { createEntry } = useWiki();
  const { canWriteActiveCampaign } = useAuth();
  const [entryTitle, setEntryTitle] = useState("");
  const [entryType, setEntryType] = useState("location");

  const handleCreateEntry = async () => {
    const trimmedTitle = entryTitle.trim();
    if (!trimmedTitle) return;

    const entry = await createEntry({
      title: trimmedTitle,
      type: entryType,
      tags: [entryType],
    });

    setEntryTitle("");
    navigate(`/entry/${entry.id}`);
  };

  return (
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
          value={entryTitle}
          onChange={(event) => setEntryTitle(event.target.value)}
          placeholder="Neverwinter, Goblin Camp, Lord Harbin..."
          disabled={!canWriteActiveCampaign}
        />

        <label className="field-label">Type</label>
        <select
          className="fantasy-input"
          value={entryType}
          onChange={(event) => setEntryType(event.target.value)}
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
  );
}

export default CreateEntryPanel;
