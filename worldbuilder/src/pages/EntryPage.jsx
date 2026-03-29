// src/pages/EntryPage.jsx
import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWiki } from "../store/wikiStore.jsx";
import { useAuth } from "../store/authStore.jsx";
import TextBlock from "../components/TextBlock.jsx";
import ImageBlock from "../components/ImageBlock.jsx";
import MapBlock from "../components/MapBlock.jsx";
import CharacterProfileBlock from "../components/CharacterProfileBlock.jsx";

function EntryPage() {
  const { isAdmin, userProfile, pinEntry, unpinEntry } = useAuth();
  const { entryId } = useParams();
  const navigate = useNavigate();
  const {
    entries,
    blocks,
    markers,
    canEditEntry,
    updateEntry,
    deleteEntry,
    createBlock,
    deleteBlock,
    moveBlock
  } = useWiki();

  const [mode, setMode] = useState("view");
  const entry = entries[entryId];
  const [tagInput, setTagInput] = useState("");
  const pinnedEntryIds = userProfile?.pinnedEntryIds ?? [];
  const isPinned = pinnedEntryIds.includes(entryId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const canEditCurrentEntry = canEditEntry(entryId);
  const resolvedMode = canEditCurrentEntry ? mode : "view";

  const entryBlocks = useMemo(() => {
    return Object.values(blocks)
      .filter((b) => b.entryId === entryId)
      .sort((a, b) => a.order - b.order);
  }, [blocks, entryId]);

  const availableTagSuggestions = useMemo(() => {
    const currentTags = new Set(((entry?.tags) ?? []).map((tag) => String(tag).toLowerCase()));
    const normalizedInput = tagInput.trim().toLowerCase();

    const allTags = new Set();

    Object.values(entries).forEach((wikiEntry) => {
      const wikiTags = Array.isArray(wikiEntry.tags) ? wikiEntry.tags : [];
      wikiTags.forEach((tag) => {
        const normalizedTag = String(tag).trim().toLowerCase();
        if (!normalizedTag) return;
        if (currentTags.has(normalizedTag)) return;

        if (!normalizedInput || normalizedTag.includes(normalizedInput)) {
          allTags.add(normalizedTag);
        }
      });
    });

    return Array.from(allTags)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 8);
  }, [entries, entry?.tags, tagInput]);

  if (!entry) {
    return (
      <div className="page">
        <p>Entry not found.</p>
      </div>
    );
  }

  const handleAddTextBlock = async () => {
    await createBlock({
      entryId,
      type: "text",
      order: entryBlocks.length,
      text: "",
    });
  };

  const handleAddImageBlock = async () => {
    await createBlock({
      entryId,
      type: "image",
      order: entryBlocks.length,
      imageFilename: "",
      caption: "",
    });
  };

  const handleAddMapBlock = async () => {
    await createBlock({
      entryId,
      type: "map",
      order: entryBlocks.length,
      imageFilename: "",
      width: null,
      height: null,
      caption: "",
    });
  };

  const handleAddCharacterProfileBlock = async () => {
    await createBlock({
      entryId,
      type: "characterProfile",
      order: entryBlocks.length,
      fields: {
        name: "",
        faction: "",
        race: "",
        gender: "",
        occupation: "",
        height: "",
        weight: "",
        age: "",
        residence: "",
      },
    });
  };

  const handleDeleteEntry = async () => {
    const confirmed = window.confirm(`Delete "${entry.title}"?`);
    if (!confirmed) return;
    await deleteEntry(entryId);
    navigate("/");
  };

  const handleTogglePinned = async () => {
    if (isPinned) {
      await unpinEntry(entryId);
      return;
    }

    await pinEntry(entryId);
  };

  const handleAddTag = async () => {
    const normalized = tagInput.trim().toLowerCase();
    if (!normalized) return;

    const currentTags = Array.isArray(entry.tags) ? entry.tags : [];
    if (currentTags.includes(normalized)) {
      setTagInput("");
      return;
    }

    await updateEntry(entryId, {
      tags: [...currentTags, normalized],
    });

    setTagInput("");
  };

  const handleRemoveTag = async (tagToRemove) => {
    const currentTags = Array.isArray(entry.tags) ? entry.tags : [];

    await updateEntry(entryId, {
      tags: currentTags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleTagInputKeyDown = async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    await handleAddTag();
  };
  
  const handleAddSuggestedTag = async (tag) => {
    const currentTags = Array.isArray(entry.tags) ? entry.tags : [];
    if (currentTags.includes(tag)) return;

    await updateEntry(entryId, {
      tags: [...currentTags, tag],
    });

    setTagInput("");
  };

return (
  <div
    className={`page entry-layout entry-layout--${resolvedMode} ${
      resolvedMode === "edit" && !isSidebarOpen ? "entry-layout--sidebar-hidden" : ""
    }`}
  >
    {resolvedMode === "edit" && canEditCurrentEntry && isSidebarOpen && (
      <aside className="entry-sidebar is-open">
        <div className="entry-sidebar__section">
          <h3 className="entry-sidebar__title">Editor</h3>

          <button
            className="fantasy-button secondary sidebar-full"
            type="button"
            onClick={() => setIsSidebarOpen(false)}
          >
            Hide Editor Sidebar
          </button>
        </div>

        <div className="entry-sidebar__section">
          <h3 className="entry-sidebar__title">Entry</h3>

          <button className="fantasy-button sidebar-full" onClick={handleAddTextBlock}>
            + Add Text
          </button>
          <button className="fantasy-button sidebar-full" onClick={handleAddImageBlock}>
            + Add Image
          </button>
          <button className="fantasy-button sidebar-full" onClick={handleAddMapBlock}>
            + Add Map
          </button>
          <button
            className="fantasy-button sidebar-full"
            onClick={handleAddCharacterProfileBlock}
          >
            + Add Character Profile
          </button>
        </div>

        <div className="entry-sidebar__section">
          <h3 className="entry-sidebar__title">Danger Zone</h3>
          <button
            className="fantasy-button danger sidebar-full"
            type="button"
            onClick={handleDeleteEntry}
          >
            Delete Entry
          </button>
        </div>
      </aside>
    )}

    <div className="entry-main">
      <div className="entry-header">
        <div className="entry-header__main">
          {resolvedMode === "edit" && canEditCurrentEntry ? (
            <>
              <div className="entry-edit-topbar">
                {!isSidebarOpen && (
                  <button
                    className="fantasy-button secondary"
                    type="button"
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    Show Editor Sidebar
                  </button>
                )}

                <button
                  className="fantasy-button secondary"
                  type="button"
                  onClick={() => setMode("view")}
                >
                  View Mode
                </button>
              </div>

              <label className="field-label">Title</label>
              <input
                className="fantasy-input fantasy-input--title"
                value={entry.title}
                onChange={(e) => updateEntry(entryId, { title: e.target.value })}
              />

              <label className="field-label">Type</label>
              <select
                className="fantasy-input"
                value={entry.type}
                onChange={(e) => updateEntry(entryId, { type: e.target.value })}
              >
                <option value="location">Location</option>
                <option value="npc">NPC</option>
                <option value="faction">Faction</option>
                <option value="quest">Quest</option>
                <option value="note">Note</option>
              </select>

              <label className="field-label">Tags</label>
              <div className="entry-tags-editor">
                <div className="entry-tags-editor__input-row">
                  <input
                    className="fantasy-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Add tag, e.g. merchant"
                  />
                  <button
                    className="fantasy-button secondary"
                    type="button"
                    onClick={handleAddTag}
                  >
                    Add Tag
                  </button>
                </div>

                <div className="entry-tags">
                  {(entry.tags ?? []).length === 0 ? (
                    <p className="block-placeholder">No tags yet.</p>
                  ) : (
                    (entry.tags ?? []).map((tag) => (
                      <button
                        key={tag}
                        className="entry-tag entry-tag--removable"
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        title={`Remove tag "${tag}"`}
                      >
                        #{tag} ×
                      </button>
                    ))
                  )}
                </div>

                {availableTagSuggestions.length > 0 && (
                  <div className="entry-tag-suggestions">
                    <div className="entry-tag-suggestions__label">Suggestions</div>
                    <div className="entry-tags">
                      {availableTagSuggestions.map((tag) => (
                        <button
                          key={tag}
                          className="entry-tag entry-tag--suggestion"
                          type="button"
                          onClick={() => handleAddSuggestedTag(tag)}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isAdmin && (
                <>
                  <label className="field-label">Visibility</label>
                  <select
                    className="fantasy-input"
                    value={entry.visibility || "public"}
                    onChange={(e) => updateEntry(entryId, { visibility: e.target.value })}
                  >
                    <option value="public">Public</option>
                    <option value="admin">Admin Only</option>
                  </select>
                </>
              )}
            </>
          ) : (
            <>
              <div className="entry-view-topbar">
                <div>
                  <h1 className="entry-title">{entry.title}</h1>
                  <p className="entry-type">{entry.type}</p>

                  {(entry.tags ?? []).length > 0 && (
                    <div className="entry-tags entry-tags--view">
                      {(entry.tags ?? []).map((tag) => (
                        <span key={tag} className="entry-tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="block-actions">
                  <button
                    className="fantasy-button secondary"
                    type="button"
                    onClick={handleTogglePinned}
                  >
                    {isPinned ? "Unpin Entry" : "Pin Entry"}
                  </button>

                  {canEditCurrentEntry ? (
                    <button
                      className="fantasy-button"
                      type="button"
                      onClick={() => setMode("edit")}
                    >
                      Edit Entry
                    </button>
                  ) : (
                    <span className="entry-type-label">Read-only</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="entry-content">
        {entryBlocks.map((block, index) => {
          const canMoveUp = index > 0;
          const canMoveDown = index < entryBlocks.length - 1;
          if (block.type === "text") {
            return (
              <TextBlock
                key={block.id}
                block={block}
                mode={resolvedMode}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                onMoveUp={() => moveBlock(entryId, block.id, "up")}
                onMoveDown={() => moveBlock(entryId, block.id, "down")}
              />
            )
          }

          if (block.type === "image") {
            return (
              <ImageBlock
                key={block.id}
                block={block}
                mode={resolvedMode}
                onDelete={() => deleteBlock(block.id)}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                onMoveUp={() => moveBlock(entryId, block.id, "up")}
                onMoveDown={() => moveBlock(entryId, block.id, "down")}
              />
            );
          }

          if (block.type === "map") {
            const blockMarkers = Object.values(markers).filter(
              (m) => m.blockId === block.id
            );

            return (
              <MapBlock
                key={block.id}
                block={block}
                mode={resolvedMode}
                markers={blockMarkers}
                onDelete={() => deleteBlock(block.id)}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                onMoveUp={() => moveBlock(entryId, block.id, "up")}
                onMoveDown={() => moveBlock(entryId, block.id, "down")}
              />
            );
          }

          if (block.type === "characterProfile") {
            return (
              <CharacterProfileBlock
                key={block.id}
                block={block}
                mode={resolvedMode}
                onDelete={() => deleteBlock(block.id)}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                onMoveUp={() => moveBlock(entryId, block.id, "up")}
                onMoveDown={() => moveBlock(entryId, block.id, "down")}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  </div>
);
}

export default EntryPage;
