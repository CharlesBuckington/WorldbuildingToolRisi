// src/components/TextBlock.jsx
import { Link } from "react-router-dom";
import { useWiki } from "../store/wikiStore.jsx";

function findEntryByTitle(entries, title) {
  const normalizedTarget = title.trim().toLowerCase();

  return Object.values(entries).find((entry) => {
    return (entry.title || "").trim().toLowerCase() === normalizedTarget;
  });
}

function renderWikiText(text, entries) {
  const parts = [];
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const entryTitle = match[1].trim();
    const customLabel = match[2]?.trim();

    const targetEntry = findEntryByTitle(entries, entryTitle);
    const label = customLabel || entryTitle;

    if (targetEntry) {
      parts.push(
        <Link key={`${entryTitle}-${match.index}`} to={`/entry/${targetEntry.id}`}>
          {label}
        </Link>
      );
    } else {
      parts.push(
        <span
          key={`${entryTitle}-${match.index}`}
          style={{ color: "#f87171" }}
          title={`Entry not found: ${entryTitle}`}
        >
          {label}
        </span>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function TextBlock({ block }) {
  const { entries, updateBlock, deleteBlock } = useWiki();

  return (
    <div className="card">
      <textarea
        value={block.text || ""}
        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
        rows={8}
        style={{ width: "100%", marginBottom: "0.75rem" }}
        placeholder={
          "Write text here.\nUse [[Entry Title]] or [[Entry Title|Custom Label]] for links."
        }
      />

      <div style={{ whiteSpace: "pre-wrap", marginBottom: "0.75rem" }}>
        {renderWikiText(block.text || "", entries)}
      </div>

      <button onClick={() => deleteBlock(block.id)}>Delete Block</button>
    </div>
  );
}

export default TextBlock;