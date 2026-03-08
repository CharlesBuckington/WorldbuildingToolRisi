// src/pages/EntryPage.jsx
import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWiki } from "../store/wikiStore.jsx";
import TextBlock from "../components/TextBlock.jsx";
import ImageBlock from "../components/ImageBlock.jsx";
import MapBlock from "../components/MapBlock.jsx";

function EntryPage() {
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
  } = useWiki();

  const entry = entries[entryId];

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
    <div className="page">
      <input
        value={entry.title}
        onChange={(e) => updateEntry(entryId, { title: e.target.value })}
        style={{ width: "100%", fontSize: "1.5rem", marginBottom: "0.75rem" }}
      />

      <select
        value={entry.type}
        onChange={(e) => updateEntry(entryId, { type: e.target.value })}
        style={{ marginBottom: "1rem" }}
      >
        <option value="location">Location</option>
        <option value="npc">NPC</option>
        <option value="faction">Faction</option>
        <option value="quest">Quest</option>
        <option value="note">Note</option>
      </select>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button onClick={handleAddTextBlock}>+ Text</button>
        <button onClick={handleAddImageBlock}>+ Image</button>
        <button onClick={handleAddMapBlock}>+ Map</button>
        <button onClick={handleDeleteEntry}>Delete Entry</button>
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        {entryBlocks.map((block) => {
          if (block.type === "text") {
            return <TextBlock key={block.id} block={block} />;
          }

          if (block.type === "image") {
            return (
              <ImageBlock
                key={block.id}
                block={block}
                onDelete={() => deleteBlock(block.id)}
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
                markers={blockMarkers}
                onDelete={() => deleteBlock(block.id)}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

export default EntryPage;