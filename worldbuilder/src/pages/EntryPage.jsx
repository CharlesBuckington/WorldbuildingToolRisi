// src/pages/EntryPage.jsx
import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWiki } from "../store/wikiStore.jsx";
import { useAuth } from "../store/authStore.jsx";
import TextBlock from "../components/TextBlock.jsx";
import ImageBlock from "../components/ImageBlock.jsx";
import MapBlock from "../components/MapBlock.jsx";


function EntryPage() {
  const { isAdmin } = useAuth();
  const { entryId } = useParams();
  const navigate = useNavigate();
  const {
    entries,
    blocks,
    markers,
    updateEntry,
    deleteEntry,
    createBlock,
    deleteBlock,
    moveBlock
  } = useWiki();

  const [mode, setMode] = useState("view");
  const entry = entries[entryId];
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const entryBlocks = useMemo(() => {
    return Object.values(blocks)
      .filter((b) => b.entryId === entryId)
      .sort((a, b) => a.order - b.order);
  }, [blocks, entryId]);

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

  const handleDeleteEntry = async () => {
    const confirmed = window.confirm(`Delete "${entry.title}"?`);
    if (!confirmed) return;
    await deleteEntry(entryId);
    navigate("/");
  };

return (
  <div className={`page entry-layout entry-layout--${mode}`}>
    {mode === "edit" && (
      <aside className={`entry-sidebar ${isSidebarOpen ? "is-open" : "is-collapsed"}`}>
        <div className="entry-sidebar__section">
          <button
            className="fantasy-button secondary sidebar-full"
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
          >
            {isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          </button>
        </div>

        {isSidebarOpen && (
          <>
            <div className="entry-sidebar__section">
              <h3 className="entry-sidebar__title">Editor</h3>

              <button
                className="fantasy-button secondary sidebar-full"
                type="button"
                onClick={() => setMode("view")}
              >
                Switch to View Mode
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
            </div>

            <div className="entry-sidebar__section">
              <h3 className="entry-sidebar__title">Danger Zone</h3>
              <button className="fantasy-button danger sidebar-full" type="button" onClick={handleDeleteEntry}>
                Delete Entry
              </button>
            </div>
          </>
        )}
      </aside>
    )}

    <div className="entry-main">
      <div className="entry-header">
        <div className="entry-header__main">
          {mode === "edit" ? (
            <>
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
                </div>

                <button
                  className="fantasy-button"
                  type="button"
                  onClick={() => setMode("edit")}
                >
                  Edit Entry
                </button>
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
                mode={mode}
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
                mode={mode}
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
                mode={mode}
                markers={blockMarkers}
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