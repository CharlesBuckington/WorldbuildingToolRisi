// src/components/TextBlock.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useWiki } from "../store/wikiStore.jsx";

function findEntryByTitle(entries, title) {
  const normalizedTarget = (title || "").trim().toLowerCase();

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

    const entryTitle = (match[1] || "").trim();
    const customLabel = (match[2] || "").trim();

    const targetEntry = findEntryByTitle(entries, entryTitle);
    const label = customLabel || entryTitle;

    if (targetEntry) {
      parts.push(
        <Link
          key={`${entryTitle}-${match.index}`}
          to={`/entry/${targetEntry.id}`}
        >
          {label}
        </Link>
      );
    } else {
      parts.push(
        <span
          key={`${entryTitle}-${match.index}`}
          className="broken-link"
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

function getLinkQueryInfo(text, cursorPosition) {
  const textBeforeCursor = text.slice(0, cursorPosition);
  const startIndex = textBeforeCursor.lastIndexOf("[[");

  if (startIndex === -1) return null;

  const afterStart = textBeforeCursor.slice(startIndex + 2);

  if (afterStart.includes("]]")) return null;
  if (afterStart.includes("|")) return null;

  return {
    startIndex,
    query: afterStart.trim(),
  };
}

function TextBlock({ block, mode, canMoveUp, canMoveDown, onMoveUp, onMoveDown }) {
  const { entries, updateBlock, deleteBlock } = useWiki();
  const [cursorPosition, setCursorPosition] = useState(0);

  const entriesArray = Object.values(entries);

  const linkQueryInfo = useMemo(() => {
    return getLinkQueryInfo(block.text || "", cursorPosition);
  }, [block.text, cursorPosition]);

  const suggestions = useMemo(() => {
    if (!linkQueryInfo) return [];

    const query = linkQueryInfo.query.toLowerCase();

    return entriesArray
      .filter((entry) => {
        if (!query) return true;
        return (entry.title || "").toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [entriesArray, linkQueryInfo]);

  const handleTextareaChange = (e) => {
    updateBlock(block.id, { text: e.target.value });
    setCursorPosition(e.target.selectionStart ?? 0);
  };

  const handleTextareaSelect = (e) => {
    setCursorPosition(e.target.selectionStart ?? 0);
  };

  const insertSuggestion = (entryTitle) => {
    if (!linkQueryInfo) return;

    const text = block.text || "";
    const before = text.slice(0, linkQueryInfo.startIndex);
    const after = text.slice(cursorPosition);
    const inserted = `[[${entryTitle}]]`;

    updateBlock(block.id, {
      text: before + inserted + after,
    });
  };

  return (
    <section className="content-block text-block">
      {mode === "edit" ? (
        <>
          <div className="text-block-editor">
            <textarea
              className="fantasy-input"
              value={block.text || ""}
              onChange={handleTextareaChange}
              onClick={handleTextareaSelect}
              onKeyUp={handleTextareaSelect}
              onSelect={handleTextareaSelect}
              rows={10}
              placeholder="Write text here. Use [[Entry Title]] for links."
            />

            {linkQueryInfo && suggestions.length > 0 && (
              <div className="link-autocomplete">
                <div className="link-autocomplete__title">Link to entry</div>
                {suggestions.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="link-autocomplete__item"
                    onClick={() => insertSuggestion(entry.title)}
                  >
                    {entry.title}
                    <span className="link-autocomplete__type">
                      {entry.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="block-actions">
            <button
              className="fantasy-button secondary"
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
            >
              ↑ Move Up
            </button>

            <button
              className="fantasy-button secondary"
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
            >
              ↓ Move Down
            </button>

            <button
              className="fantasy-button danger"
              onClick={() => deleteBlock(block.id)}
            >
              Delete Block
            </button>
          </div>
        </>
      ) : (
        <div className="text-block-rendered">
          {renderWikiText(block.text || "", entries)}
        </div>
      )}
    </section>
  );
}

export default TextBlock;